import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = true;
Vue.prototype.baseUrl = "https://localhost:8085/";

new Vue({
  router,
  vuetify,
  render: h => h(App)
}).$mount("#app");
