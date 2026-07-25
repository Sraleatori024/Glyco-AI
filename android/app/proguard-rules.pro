# ProGuard Rules for Glyco Production Release

# Keep generic types and signature info for Firebase/Serialization
-keepattributes Signature, InnerClasses, EnclosingMethod, Annotation, SourceFile, LineNumberTable

# Preserve WebViews and JavaScript interaction bindings
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class android.webkit.** { *; }

# Keep Firebase models and libraries safe from obfuscation
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Strip debug and verbose log lines automatically during production release compilation
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
