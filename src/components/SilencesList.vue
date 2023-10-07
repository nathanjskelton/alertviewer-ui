<template>
    <v-app-bar height="40"    
        color="purple-lighten-5"
        dense
        dark
        flat
    >


    <v-spacer></v-spacer>
    <v-btn tile @click="newSilence()" target="_blank" text>
      New Silence
      <v-icon>mdi-sleep</v-icon>
    </v-btn>    
    <v-btn tile @click="fetchData()" target="_blank" text>
      Query
      <v-icon>mdi-database-refresh</v-icon>
    </v-btn>

    
  </v-app-bar>
    
  <v-data-table
    dense=true
    :headers="headers"
    :items="silences"
    item-value="id"
    :sort-by="[{ key: 'name', order: 'desc' }]"
    :loading="loading"
  >

    <template v-slot:top>
        <v-dialog max-width="700px" v-model="silence.dialog" persistent>
        <v-card class="pa-3">
          <v-card-title class="pa-4" style="background-color: purple; color: white; font-size: large; font-weight: bold;">Silence</v-card-title>
          <v-card-text>
            <v-form dense>
              
              <v-row class="pa-0 ma-0">
                <v-col cols=12 class="pt-0 pb-0 px-0 ma-0">

                  <v-card
                    class="mx-auto"
                    max-width="620"
                  >
                    <v-card-item class="bg-purple-lighten-4">
                      <v-card-title>
                        Matchers
                      </v-card-title>

                      <template v-slot:append>
                        <v-btn
                          color="white"
                          icon="mdi-plus"
                          size="small"
                          @click="newMatcher();"
                        ></v-btn>
                      </template>

                    </v-card-item>

                    <v-divider></v-divider>

                    <v-virtual-scroll
                      :items="currentSilence.matchers"
                      height=160
                      item-height="50"
                    >
                      <template v-slot:default="{ item }">
                        <v-list-item>
                          <v-container class="pa-0 ma-0"><v-row dense no-gutters >
                          <v-col cols="1" class="pt-2 pl-2">
                            <v-icon @click="deleteMatcher(item.name, item.value);" size="x-large" color="purple-lighten-2">mdi-delete-circle</v-icon>
                          </v-col>
                          
                          <v-col cols="5">
                            <v-list-item><v-text-field v-model="item.name" density="compact"></v-text-field></v-list-item>
                          </v-col>
                          <v-col cols="1" class="pt-2 pl-2"> 
                            <v-icon @click="toggleMatcher(item.name, item.value)" v-if="item.isEqual == true" size="x-large" color="grey-lighten-2">mdi-equal-box</v-icon>
                            <v-icon @click="toggleMatcher(item.name, item.value)" v-if="item.isEqual == false" size="x-large" color="grey-lighten-2">mdi-code-not-equal</v-icon>
                          </v-col>
                          <v-col cols="5">
                            <v-list-item><v-text-field v-model="item.value" density="compact"></v-text-field></v-list-item>
                          </v-col>
                        </v-row></v-container>
                        </v-list-item>
                      </template>
                    </v-virtual-scroll>
                  </v-card>

                </v-col>
              </v-row >
              
              <v-row class="px-0 mx-0">
                <v-col cols=2 class="pt-4 pb-0 px-0 ma-0"><div>Comment</div></v-col>
                <v-col cols=10 class="pa-0 ma-0"><v-text-field v-model="currentSilence.comment"></v-text-field></v-col>
              </v-row>
              <v-row class="pa-0 ma-0">
                <v-col cols=2 class="pt-4 pb-0 px-0 ma-0"><div>Hours</div></v-col>
                <v-col cols=2 class="pa-0 ma-0"><v-text-field v-model="currentSilence.hours"></v-text-field></v-col>
              </v-row>

            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn color="blue-darken-1" text @click="silence.dialog=false;saveSilence();">Save</v-btn>
            <v-btn color="blue-darken-1" text @click="silence.dialog=false;">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>

    <template v-slot:[`item.actions`]="{ item }">
        <v-container><v-row justify="end">
        <v-col cols=2>
        <v-btn icon dense size="small" @click="editSilence(item.raw);"><v-icon>mdi-pencil</v-icon></v-btn>
        </v-col>
        <v-col cols=2>
        <v-btn icon dense size="small" @click="deleteSilence(item.raw.id);"><v-icon>mdi-delete</v-icon></v-btn>
        </v-col>
        </v-row></v-container>
    </template>
  </v-data-table>
</template>

<script>
    import axios from "axios";

    export default {
        emits: ['alerts','alert','status'],
        data() {
            return {
                currentSilence: {
                    matchers: [
                        {
                            isRegex: true,
                            isEqual: true,
                            name: null,
                            value: null
                        }
                    ],
                    createdBy: "ui",
                    startsAt: null,
                    comment: null,
                    id: null,
                    endsAt: null,
                    updatedAt: null,
                    hours: 1,
                    hoursLeft: 1,
                    status: {
                        state: "active"
                    }
                },
                silence: {
                    dialog: false,
                },                
                silences: [],
                expanded: [],
                headers: [
                    {
                    key: "comment",
                    title: "Comment",
                    align: "left",
                    sortable: true,
                    value: "comment",
                    filterable: true,
                    width:120 
                    },
                    {
                    key: "hoursLeft",
                    title: "Hours Left",
                    align: "left",
                    sortable: true,
                    value: "hoursLeft",
                    filterable: true,
                    width:50 
                    },
                    {
                    key: "actions",
                    title: "",
                    align: "start",
                    sortable: false,
                    value: "actions",
                    width: 130,
                    filterable: false
                    }           
                ],
                loading: true,
                
            }
        },
        mounted() {
            setTimeout(() => {
            console.log("*** SILENCES TIMEOUT FIRED ***")
            
            this.fetchData();
            }, 1000);

        },
        methods: {
            handleError() {

            },
            fetchData() {
                this.loading = true;
                let urlString = this.baseUrl;
                urlString = urlString + "request";

                    console.log("FETCHING: "+urlString)
                    axios.get(urlString)
                    .then(response => {
                        console.log(response.data.payload);
                        this.silences = response.data.payload.silences;
                        })
                    .catch(error => {
                        console.log(error);
                        this.handleError(error);
                        this.loading = false;
                    });

                this.loading = false;
            },
            newMatcher() {
                this.currentSilence.matchers.push(
                    {
                    name: null,
                    value: null,
                    isEqual: true
                    });
            },
            deleteMatcher(name, value) {
                this.currentSilence.matchers = this.currentSilence.matchers.filter( el => (el.name+el.value+"" !== name+value+""));
            },
            toggleMatcher(name, value) {
                var result = this.currentSilence.matchers.find(obj => {
                    return obj.name === name && obj.value === value;
                });
                if (result.isEqual == true) {
                    result.isEqual = false;
                } else {
                    result.isEqual = true;
                }
            },
            newSilence() {
                this.currentSilence.id = null;
                this.currentSilence.createdBy = "ui";
                this.currentSilence.status.state = "active";
                this.currentSilence.comment = "New Silence";
                this.currentSilence.matchers = [];
                this.currentSilence.hours = 24;
                this.currentSilence.hoursLeft = 24;
                this.silence.dialog = true;
            },
            deleteSilence(id) {
                axios.delete(this.baseUrl + "deleteSilence?id="+id)
                //eslint-disable-next-line no-unused-vars
                .then(response => {
                    this.fetchData();
                })
                .catch(error => {
                    this.handleError(error);
                });                
            },
            saveSilence() {
                axios.post(this.baseUrl + "silence", this.currentSilence)
                //eslint-disable-next-line no-unused-vars
                .then(response => {
                    this.fetchData();
                    //this.onSuccess(response);
                })
                .catch(error => {
                this.handleError(error);
                });
            },
            editSilence(item) {
                this.currentSilence.comment = item.comment;
                this.currentSilence.id = item.id;
                this.currentSilence.createdBy = item.createdBy;
                this.currentSilence.status.state = item.status.state;
                this.currentSilence.matchers = item.matchers;

                this.currentSilence.hours = item.hours;                                                                       
                this.silence.dialog = true;
            }
        }
    }
</script>