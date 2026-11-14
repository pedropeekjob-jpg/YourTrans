package space.casulo.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Nome e ícone discretos no ecrã inicial.
 *
 * O AndroidManifest tem dois "atalhos" (activity-alias) para a mesma atividade: ".Casulo" e
 * ".Notas". Ativar um e desativar o outro troca o nome e o ícone mostrados pelo launcher.
 * Nada de escondido: é a própria pessoa que escolhe nas Definições, e a app continua a
 * chamar-se Casulo nas Definições do sistema e na loja.
 */
@CapacitorPlugin(name = "DiscreetIcon")
public class DiscreetIconPlugin extends Plugin {

    private ComponentName alias(String name) {
        Context ctx = getContext();
        return new ComponentName(ctx.getPackageName(), "space.casulo.app." + name);
    }

    private boolean enabled(PackageManager pm, String name) {
        int s = pm.getComponentEnabledSetting(alias(name));
        if (s == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) return "Casulo".equals(name);
        return s == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }

    @PluginMethod
    public void get(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        JSObject r = new JSObject();
        r.put("discreet", enabled(pm, "Notas"));
        r.put("changesName", true);
        call.resolve(r);
    }

    @PluginMethod
    public void set(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("discreet", false));
        PackageManager pm = getContext().getPackageManager();
        // Ativar primeiro o novo e só depois desligar o antigo, para nunca ficar sem ícone.
        pm.setComponentEnabledSetting(alias(on ? "Notas" : "Casulo"),
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        pm.setComponentEnabledSetting(alias(on ? "Casulo" : "Notas"),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        call.resolve();
    }
}
