package Glyco.a2026;

import android.app.Application;
import com.google.firebase.FirebaseApp;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize Firebase SDK for Android services
        FirebaseApp.initializeApp(this);
    }
}
