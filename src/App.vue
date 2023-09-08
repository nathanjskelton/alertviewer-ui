<template>
  <v-app>
    
    <v-footer app color="white" class="ma-0 pa-0">
      <v-container fluid class="ma-0 pa-0">
      <v-row dense class="ms-2 me-2 mb-0 mt-0 pa-0">
        <v-col class="ma-0 pa-0">
        <v-alert v-bind:key="item.message" v-for="item in alerts" v-model="alerts" transition="fade-transition" :type="item.type" rounded>{{ item.message }}</v-alert>
        <v-alert v-model="showAlert" transition="fade-transition" :type="this.alertType" rounded>{{ this.alert }}</v-alert>
        </v-col>
      </v-row>
      <v-row dense >
        <v-col class="ma-0 pa-0">
        <v-card class="pa-0" height="30px" flat color="grey lighten-2"><v-card-text class="pt-1 ps-5">{{ status }}</v-card-text></v-card>
        </v-col>
      </v-row>
      </v-container>
    </v-footer>
    <v-main>
      <ResultList @alert="setAlert" @alerts="setAlerts" @status="setStatus" :query="this.$route.query" :router="this.$router" />
    </v-main>
  </v-app>
</template>

<script>
import ResultList from "./components/ResultList";
//import { setTimeout } from 'timers';

export default {
  name: "App",
  methods: {
    setStatus(text) {
      this.status = text;
    },
    setAlert(text, type) {
      this.alert = text;
      this.alertType = type; 
      this.showAlert = false;
      setTimeout(() => {this.showAlert = true}, 250);
      //if (type == "success") {
        setTimeout(() => {this.showAlert = false}, 4000);
      //}
    },
    setAlerts(alerts) {
      this.alerts = alerts;
    }
  },
  components: {
    ResultList
  },

  data: () => ({
    alertType: "success",
    showAlert: false,
    alert: "",
    alerts: [{'type': 'success', 'message': 'Welcome'}],
    status: "Initializing..."
  })
};
</script>
