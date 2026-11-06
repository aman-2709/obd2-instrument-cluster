// Runtime settings, loaded by index.html before the app. `npm start` serves this file as is, so the
// theme comes from REACT_APP_CLUSTER_THEME. The production image overwrites it when the container
// starts (docker-entrypoint.d/40-cluster-config.sh).
window.__CLUSTER_CONFIG__ = { theme: '' };
