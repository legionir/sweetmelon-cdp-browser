allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

// Library plugins compiled against an older SDK fail release resource linking
// (e.g. flutter_app_badger_plus: android:attr/lStar not found). Align them.
// Must run AFTER the plugin's own android {} block (which sets its own
// compileSdk), so the override is applied in afterEvaluate. Projects that are
// already evaluated (evaluationDependsOn(":app")) get it immediately.
subprojects {
    if (state.executed) {
        pluginManager.withPlugin("com.android.library") {
            extensions.configure<com.android.build.gradle.LibraryExtension> {
                compileSdk = 37
            }
        }
    } else {
        afterEvaluate {
            pluginManager.withPlugin("com.android.library") {
                extensions.configure<com.android.build.gradle.LibraryExtension> {
                    compileSdk = 37
                }
            }
        }
    }
}
