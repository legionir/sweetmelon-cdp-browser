(function (global) {
  'use strict';

  // ═══════════════════════════════════════
  //  Retry Manager
  // ═══════════════════════════════════════

  var RetryManager = {
    defaultConfig: {
      maxRetries: 3,
      initialDelayMs: 200,
      backoffMultiplier: 2.0,
      maxDelayMs: 10000,
      retryableCodes: ['TIMEOUT', 'EXECUTION_ERROR', 'NETWORK_ERROR']
    },

    _pluginConfigs: {},

    setConfig: function (plugin, config) {
      this._pluginConfigs[plugin] = Object.assign({}, this.defaultConfig, config);
    },

    getConfig: function (plugin) {
      return this._pluginConfigs[plugin] || this.defaultConfig;
    },

    executeWithRetry: function (fn, options) {
      options = options || {};
      var config = Object.assign(
        {},
        this.defaultConfig,
        this._pluginConfigs[options.plugin] || {},
        options
      );

      return this._retry(fn, config, 0);
    },

    _retry: function (fn, config, attempt) {
      var self = this;

      return fn().catch(function (error) {
        attempt++;

        var isRetryable = self._isRetryable(error, config.retryableCodes);
        var hasMoreRetries = attempt <= config.maxRetries;

        if (!isRetryable || !hasMoreRetries) {
          throw error;
        }

        var delay = self._calculateDelay(attempt, config);

        if (config.onRetry) {
          config.onRetry(attempt, error, delay);
        }

        console.warn(
          '[Retry] Attempt ' + attempt + '/' + config.maxRetries +
          ', retrying in ' + delay + 'ms: ' +
          (error.message || error.code || JSON.stringify(error))
        );

        return new Promise(function (resolve) {
          setTimeout(resolve, delay);
        }).then(function () {
          return self._retry(fn, config, attempt);
        });
      });
    },

    _isRetryable: function (error, retryableCodes) {
      if (!error) return false;
      var code = error.code || '';
      return retryableCodes.indexOf(code) !== -1;
    },

    _calculateDelay: function (attempt, config) {
      var delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
      delay = Math.min(delay, config.maxDelayMs);
      var jitter = delay * 0.2 * Math.random();
      return Math.round(delay + jitter);
    }
  };

  // ═══════════════════════════════════════
  //  Circuit Breaker (JS side)
  // ═══════════════════════════════════════

  function CircuitBreaker(name, config) {
    this.name = name;
    this.config = Object.assign({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenMaxAttempts: 1
    }, config || {});

    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = null;
  }

  CircuitBreaker.prototype.isAllowed = function () {
    this._checkState();

    switch (this.state) {
      case 'closed': return true;
      case 'open': return false;
      case 'halfOpen': return this.halfOpenAttempts < this.config.halfOpenMaxAttempts;
      default: return true;
    }
  };

  CircuitBreaker.prototype._checkState = function () {
    if (this.state === 'open' && this.lastFailureTime) {
      var elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state = 'halfOpen';
        this.halfOpenAttempts = 0;
        console.log('[CircuitBreaker] [' + this.name + '] → half-open');
      }
    }
  };

  CircuitBreaker.prototype.execute = function (fn) {
    var self = this;

    if (!this.isAllowed()) {
      var retryAfter = this.lastFailureTime
        ? Math.max(0, this.config.resetTimeoutMs - (Date.now() - this.lastFailureTime))
        : this.config.resetTimeoutMs;

      return Promise.reject({
        code: 'CIRCUIT_OPEN',
        message: 'Circuit breaker [' + this.name + '] is open. Retry after ' + retryAfter + 'ms',
        retryAfterMs: retryAfter
      });
    }

    this.totalCalls++;

    if (this.state === 'halfOpen') {
      this.halfOpenAttempts++;
    }

    return fn().then(function (result) {
      self._onSuccess();
      return result;
    }).catch(function (error) {
      self._onFailure();
      throw error;
    });
  };

  CircuitBreaker.prototype._onSuccess = function () {
    this.successCount++;
    if (this.state === 'halfOpen') {
      this.state = 'closed';
      this.failureCount = 0;
      console.log('[CircuitBreaker] [' + this.name + '] → closed (recovered)');
    } else if (this.failureCount > 0) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  };

  CircuitBreaker.prototype._onFailure = function () {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'halfOpen') {
      this.state = 'open';
      console.warn('[CircuitBreaker] [' + this.name + '] → open (half-open test failed)');
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      console.warn('[CircuitBreaker] [' + this.name + '] → open after ' + this.failureCount + ' failures');
    }
  };

  CircuitBreaker.prototype.reset = function () {
    this.state = 'closed';
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = null;
  };

  CircuitBreaker.prototype.getStats = function () {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls
    };
  };

  // ═══════════════════════════════════════
  //  Circuit Breaker Registry
  // ═══════════════════════════════════════

  var CircuitBreakerRegistry = {
    _breakers: {},
    _defaultConfig: {},

    setDefaultConfig: function (config) {
      this._defaultConfig = config;
    },

    get: function (name) {
      if (!this._breakers[name]) {
        this._breakers[name] = new CircuitBreaker(name, this._defaultConfig);
      }
      return this._breakers[name];
    },

    reset: function (name) {
      if (this._breakers[name]) {
        this._breakers[name].reset();
      }
    },

    resetAll: function () {
      Object.keys(this._breakers).forEach(function (key) {
        this._breakers[key].reset();
      }.bind(this));
    },

    getAllStats: function () {
      var stats = {};
      Object.keys(this._breakers).forEach(function (key) {
        stats[key] = this._breakers[key].getStats();
      }.bind(this));
      return stats;
    }
  };

  // ═══════════════════════════════════════
  //  Offline Queue
  // ═══════════════════════════════════════

  var OfflineQueue = {
    _queue: [],
    _completed: [],
    _failed: [],
    _online: true,
    _paused: false,
    _processing: false,
    _timer: null,
    _eventListeners: {},

    config: {
      maxQueueSize: 200,
      defaultTtlMs: 3600000,
      processIntervalMs: 5000,
      maxRetries: 3
    },

    init: function (config) {
      Object.assign(this.config, config || {});
      this._startTimer();

      // اتصال به connectivity events
      if (global.NativeSDK) {
        global.NativeSDK.on('connectivity.change', function (data) {
          this.setOnline(data.online);
        }.bind(this));
      }
    },

    setOnline: function (online) {
      var wasOffline = !this._online;
      this._online = online;

      if (online && wasOffline && this._queue.length > 0) {
        console.log('[OfflineQueue] Back online — processing ' + this._queue.length + ' items');
        this._emit('online', { pendingCount: this._queue.length });
        this._processQueue();
      }

      if (!online) {
        this._emit('offline', { pendingCount: this._queue.length });
      }
    },

    enqueue: function (plugin, method, args, options) {
      options = options || {};

      if (this._queue.length >= this.config.maxQueueSize) {
        var removed = this._queue.shift();
        console.warn('[OfflineQueue] Queue full, removing:', removed.plugin + '.' + removed.method);
      }

      var item = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        plugin: plugin,
        method: method,
        args: args || {},
        createdAt: Date.now(),
        expiresAt: Date.now() + (options.ttlMs || this.config.defaultTtlMs),
        status: 'pending',
        attempts: 0,
        lastError: null
      };

      this._queue.push(item);
      this._emit('enqueued', item);

      if (this._online && !this._paused) {
        this._processQueue();
      }

      return item.id;
    },

    _startTimer: function () {
      var self = this;
      if (this._timer) clearInterval(this._timer);
      this._timer = setInterval(function () {
        if (self._online && !self._paused && self._queue.length > 0) {
          self._processQueue();
        }
      }, this.config.processIntervalMs);
    },

    _processQueue: async function () {
      if (this._processing || this._paused) return;
      this._processing = true;

      try {
        while (this._queue.length > 0 && this._online && !this._paused) {
          var item = this._queue[0];

          if (Date.now() > item.expiresAt) {
            this._queue.shift();
            item.status = 'expired';
            this._failed.push(item);
            this._emit('expired', item);
            continue;
          }

          item.status = 'processing';
          item.attempts++;

          try {
            var result = await global.NativeSDK.call(
              item.plugin,
              item.method,
              item.args
            );

            this._queue.shift();
            item.status = 'completed';
            this._completed.push(item);
            this._emit('completed', { item: item, result: result });
          } catch (error) {
            item.lastError = error.message || error.code || JSON.stringify(error);

            if (item.attempts >= this.config.maxRetries) {
              this._queue.shift();
              item.status = 'failed';
              this._failed.push(item);
              this._emit('failed', item);
            } else {
              item.status = 'pending';
              this._queue.push(this._queue.shift());
            }
          }
        }
      } finally {
        this._processing = false;
      }
    },

    pause: function () { this._paused = true; },
    resume: function () { this._paused = false; this._processQueue(); },
    clear: function () { this._queue = []; this._completed = []; this._failed = []; },

    remove: function (itemId) {
      var idx = this._queue.findIndex(function (i) { return i.id === itemId; });
      if (idx !== -1) { this._queue.splice(idx, 1); return true; }
      return false;
    },

    getStats: function () {
      return {
        pending: this._queue.length,
        completed: this._completed.length,
        failed: this._failed.length,
        online: this._online,
        paused: this._paused,
        processing: this._processing
      };
    },

    getPending: function () {
      return this._queue.map(function (i) {
        return { id: i.id, plugin: i.plugin, method: i.method, attempts: i.attempts, status: i.status };
      });
    },

    on: function (event, callback) {
      if (!this._eventListeners[event]) this._eventListeners[event] = [];
      this._eventListeners[event].push(callback);
      return function () { this.off(event, callback); }.bind(this);
    },

    off: function (event, callback) {
      if (!this._eventListeners[event]) return;
      this._eventListeners[event] = this._eventListeners[event].filter(function (cb) {
        return cb !== callback;
      });
    },

    _emit: function (event, data) {
      var listeners = this._eventListeners[event] || [];
      listeners.forEach(function (cb) { try { cb(data); } catch (_) {} });
    },

    dispose: function () {
      if (this._timer) clearInterval(this._timer);
      this._queue = [];
    }
  };

  // ═══════════════════════════════════════
  //  Resilient Call — wraps everything
  // ═══════════════════════════════════════

  function resilientCall(plugin, method, args, options) {
    options = options || {};
    var enableRetry = options.retry !== false;
    var enableCircuitBreaker = options.circuitBreaker !== false;
    var queueIfOffline = options.queueIfOffline === true;

    var breaker = enableCircuitBreaker
      ? CircuitBreakerRegistry.get(plugin)
      : null;

    var callFn = function () {
      var execFn = function () {
        return global.NativeSDK.call(plugin, method, args, options);
      };

      if (breaker) {
        return breaker.execute(execFn);
      }
      return execFn();
    };

    var wrappedFn;

    if (enableRetry) {
      wrappedFn = function () {
        return RetryManager.executeWithRetry(callFn, {
          plugin: plugin,
          maxRetries: options.maxRetries,
          onRetry: options.onRetry
        });
      };
    } else {
      wrappedFn = callFn;
    }

    return wrappedFn().catch(function (error) {
      if (queueIfOffline && !OfflineQueue._online) {
        console.log('[Resilient] Queuing offline: ' + plugin + '.' + method);
        var itemId = OfflineQueue.enqueue(plugin, method, args, {
          ttlMs: options.queueTtlMs
        });
        return { queued: true, queueItemId: itemId };
      }
      throw error;
    });
  }

  // ═══════════════════════════════════════
  //  Export
  // ═══════════════════════════════════════

  global.NativeResilience = {
    RetryManager: RetryManager,
    CircuitBreaker: CircuitBreakerRegistry,
    OfflineQueue: OfflineQueue,
    resilientCall: resilientCall,

    init: function (config) {
      config = config || {};

      if (config.retry) {
        RetryManager.defaultConfig = Object.assign(
          RetryManager.defaultConfig,
          config.retry
        );
      }

      if (config.circuitBreaker) {
        CircuitBreakerRegistry.setDefaultConfig(config.circuitBreaker);
      }

      if (config.offlineQueue) {
        OfflineQueue.init(config.offlineQueue);
      } else {
        OfflineQueue.init();
      }

      console.log('[NativeResilience] Initialized');
    },

    getStats: function () {
      return {
        circuitBreakers: CircuitBreakerRegistry.getAllStats(),
        offlineQueue: OfflineQueue.getStats(),
        retryConfig: RetryManager.defaultConfig
      };
    }
  };

})(window);
