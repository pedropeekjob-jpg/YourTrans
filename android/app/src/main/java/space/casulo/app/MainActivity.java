package space.casulo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins próprios do Casulo (têm de ser registados antes de super.onCreate).
        registerPlugin(DiscreetIconPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
