<template>
  <v-main>
    <router-view @alerts="setAlerts" @alert="setAlert"  @status="setStatus"/>
  </v-main>
</template>

<script>
  export default {
    methods: {
      setAlert(alert, type) {
        this.$emit('alert', alert, type);
      },
      setAlerts(alerts) {
        this.$emit('alerts', alerts);
      },
      setStatus(status) {
        this.$emit('status', status);
      },
    },
    emits: ['alerts','alert','status'],
  }

</script>
