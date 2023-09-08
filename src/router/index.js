import Vue from "vue";
import VueRouter from "vue-router";
import Results from "../views/Results.vue";
import DatetimePicker from "vuetify-datetime-picker";

Vue.use(VueRouter);
Vue.use(DatetimePicker);

const routes = [
  {
    path: "/",
    name: "Results",
    component: Results
  }
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes
});

export default router;
