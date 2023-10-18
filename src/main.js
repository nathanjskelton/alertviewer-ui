/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

// Plugins
import { registerPlugins } from '@/plugins'

import Vue3EasyDataTable from 'vue3-easy-data-table';
import 'vue3-easy-data-table/dist/style.css';

const app = createApp(App)
//app.config.globalProperties.baseUrl = process.env.VUE_APP_SERVER_URL;
app.component('EasyDataTable', Vue3EasyDataTable);
app.config.globalProperties.baseUrl = import.meta.env.VITE_APP_SERVER_URL;

//app.config.globalProperties.baseUrl = "https://localhost:8085/";

registerPlugins(app)

app.mount('#app')
