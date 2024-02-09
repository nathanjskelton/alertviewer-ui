<template>
  <div>
    <v-app-bar
      color="deep-purple accent-4"
      dense
      dark
    >
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-app-bar-nav-icon v-bind="props"></v-app-bar-nav-icon>

        </template>
        <v-list>
          
          <v-list-item>
            <v-list-item-title> <router-link class="a menu-link" :to="{ name: 'Results' }"> ALERTS</router-link></v-list-item-title>
          </v-list-item>
          
          <v-list-item>
            <v-list-item-title><router-link class="a menu-link" :to="{ name: 'Silences' }">SILENCES</router-link></v-list-item-title>
          </v-list-item>

          <v-list-item v-if="cortana_role.value == 'admin'">
            <v-list-item-title><router-link class="a menu-link" :to="{ name: 'Users' }">USERS</router-link></v-list-item-title>
          </v-list-item>
                    
        </v-list>
      </v-menu>

      <v-toolbar-title>GM Alert Viewer</v-toolbar-title>
      <v-spacer/>
      <div class="mr-5">{{cortana_user.value}}:{{cortana_role.value}}</div>
      

     
    </v-app-bar>
  </div>
</template>

<script>
  export default {
    props: {
      cortana_user: String,
      cortana_role: String,
    },


  }
</script>

<style>
.menu-link {
  color:black;
  text-decoration: none;
}
.router-link-active {
  border-left: 3px solid red;
  padding-left: 4px;
}
</style>
