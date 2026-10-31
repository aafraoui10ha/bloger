//! Keeps the app window on the bundled Toolbox pages. Links to websites open in
//! the user's default browser instead, so remote pages never get access to the
//! app's privileged commands.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime, Url,
};
use tauri_plugin_opener::OpenerExt;

/// True for the app's own pages (and the dev server in debug builds).
pub fn is_app_url(url: &Url) -> bool {
    match url.scheme() {
        "tauri" => true,
        "about" => url.as_str() == "about:blank",
        "http" | "https" => match url.host_str() {
            Some("tauri.localhost") => true,
            Some("localhost") | Some("127.0.0.1") => cfg!(debug_assertions),
            _ => false,
        },
        _ => false,
    }
}

/// Links the app may hand to the default browser or mail client.
pub fn is_external_link(url: &Url) -> bool {
    matches!(url.scheme(), "https" | "http" | "mailto")
}

pub fn guard<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("navigation-guard")
        .on_navigation(|webview, url| {
            if is_app_url(url) {
                return true;
            }
            if is_external_link(url) {
                let _ = webview.opener().open_url(url.as_str(), None::<&str>);
            }
            false
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn u(s: &str) -> Url {
        Url::parse(s).unwrap()
    }

    #[test]
    fn allows_only_local_app_pages() {
        assert!(is_app_url(&u("https://tauri.localhost/tool/chart-designer/")));
        assert!(is_app_url(&u("tauri://localhost/")));
        assert!(is_app_url(&u("about:blank")));
        assert!(!is_app_url(&u("https://example.com/")));
        assert!(!is_app_url(&u("https://tauri.localhost.example.com/")));
        assert!(!is_app_url(&u("file:///C:/Windows/system32")));
        assert!(!is_app_url(&u("blob:https://tauri.localhost/abc")));
        assert!(!is_app_url(&u("data:text/html,hi")));
    }

    #[test]
    fn opens_only_web_and_mail_links_externally() {
        assert!(is_external_link(&u("https://example.com")));
        assert!(is_external_link(&u("mailto:hello@example.com")));
        assert!(!is_external_link(&u("file:///C:/")));
        assert!(!is_external_link(&u("ms-settings:privacy")));
        assert!(!is_external_link(&u("javascript:alert(1)")));
    }
}
