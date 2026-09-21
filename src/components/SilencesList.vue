<template>

  <v-app-bar height="40"    
        class="mt-5"
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
    <v-btn tile @click="newOutage()" target="_blank" text>
      Outage
      <v-icon>mdi-power-plug-off</v-icon>
    </v-btn>
    <v-btn tile @click="fetchData()" target="_blank" text>
      Query
      <v-icon>mdi-database-refresh</v-icon>
    </v-btn>  
  </v-app-bar>
    

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
          <v-row class="px-0 mx-0">
            <v-col cols=12 class="pa-0 ma-0">
              
              <v-select
                    :items="alertmanagers"
                    density="compact"
                    label="Alertmanager"
                    v-model="currentSilence.alertmanager"
              ></v-select>
              
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn color="blue-darken-1" text @click="silence.dialog=false;saveSilence();">Save</v-btn>
        <v-btn color="blue-darken-1" text @click="silence.dialog=false;">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
    
  <!-- An outage is one silence covering whole environments and teams for a window,
       rather than a matcher typed out by hand. The lists start as everything the
       chosen alertmanager has ever reported, and are narrowed down from there. -->
  <v-dialog max-width="700px" v-model="outage.dialog" persistent>
    <v-card class="pa-3">
      <v-card-title class="pa-4" style="background-color: purple; color: white; font-size: large; font-weight: bold;">Outage</v-card-title>
      <v-card-text>
        <v-form dense>

          <v-text-field v-model="outage.name" label="Outage name" density="compact"
              hint="Recorded as the silence comment" persistent-hint></v-text-field>

          <v-select :items="alertmanagers" v-model="outage.alertmanager" label="Alertmanager"
              density="compact" class="mt-3" @update:modelValue="fetchLabelValues()"></v-select>

          <v-row class="pa-0 ma-0">
            <v-col cols=6 class="pl-0 ma-0">
              <v-text-field v-model="outage.startsAt" label="Starts" type="datetime-local" density="compact"></v-text-field>
            </v-col>
            <v-col cols=6 class="pr-0 ma-0">
              <v-text-field v-model="outage.endsAt" label="Ends" type="datetime-local" density="compact"></v-text-field>
            </v-col>
          </v-row>

          <div v-if="outage.alertmanager == null" style="font-size: 12px; color: #777;">
            Choose an alertmanager to load its environments and teams.
          </div>

          <template v-else>
            <v-combobox v-model="outage.environments" :items="outage.allEnvironments"
                label="Environments" multiple chips closable-chips density="compact"
                :loading="outage.loading"
                hint="Everything this alertmanager has reported. Remove what the outage does not cover, or type to add."
                persistent-hint></v-combobox>

            <v-combobox v-model="outage.teams" :items="outage.allTeams" class="mt-3"
                label="Teams" multiple chips closable-chips density="compact"
                :loading="outage.loading"
                hint="Leave empty to silence every team in those environments."
                persistent-hint></v-combobox>
          </template>

          <div v-if="outageProblem != null" class="mt-3" style="font-size: 12px; color: #b45309;">
            {{ outageProblem }}
          </div>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn color="blue-darken-1" text :disabled="outageProblem != null"
            @click="outage.dialog=false;createOutage();">Create Outage</v-btn>
        <v-btn color="blue-darken-1" text @click="outage.dialog=false;">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <EasyDataTable
    :headers="headers"
    :items="silences"
    :loading="loading"
    
  >

    <template #item-actions="item">
 
      <table><tr><td style="padding: 5px">
        <v-btn icon dense size="x-small" @click="editSilence(item);"><v-icon>mdi-pencil</v-icon></v-btn>
      </td><td style="padding: 5px">
        <v-btn icon dense size="x-small" @click="deleteSilence(item.id);"><v-icon>mdi-delete</v-icon></v-btn>
      </td></tr></table>
    </template>

  </EasyDataTable>
</template>

<script>
    import axios from "axios";

    export default {
        emits: ['alerts','alert','status','token','user','role'],
        props: {
          cortana_token: String,
          cortana_user: String,
          cortana_role: String,
        },
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
                    createdBy: "unknown",
                    startsAt: null,
                    comment: null,
                    id: null,
                    endsAt: null,
                    updatedAt: null,
                    hours: 1,
                    hoursLeft: 1,
                    status: {
                        state: "active"
                    },
                    alertmanager: null,
                },
                silence: {
                    dialog: false,
                },
                outage: {
                    dialog: false,
                    loading: false,
                    name: null,
                    alertmanager: null,
                    startsAt: null,
                    endsAt: null,
                    //what the alertmanager has ever reported, and what this outage covers
                    allEnvironments: [],
                    allTeams: [],
                    //the labels that carry an environment on the wire, from the server
                    environmentLabels: ["environment"],
                    environments: [],
                    teams: [],
                },

                silences: [],
                alertmanagers: [],
                expanded: [],
                headers: [
                    {
                    key: "comment",
                    text: "Comment",
                    align: "left",
                    sortable: true,
                    value: "comment",
                    filterable: true,
                    },
                    {
                    key: "createdBy",
                    text: "Creator",
                    align: "left",
                    sortable: true,
                    value: "createdBy",
                    filterable: true,
                    },
                    {
                    key: "alertmanager",
                    text: "Alertmanager",
                    align: "left",
                    sortable: true,
                    value: "alertmanager",
                    filterable: true,
                    },                    
                    {
                    key: "hoursLeft",
                    text: "Hours Left",
                    align: "left",
                    sortable: true,
                    value: "hoursLeft",
                    filterable: true,
                    },
                    {
                    key: "actions",
                    text: "",
                    align: "start",
                    sortable: false,
                    value: "actions",
                    filterable: false
                    }           
                ],
                loading: true,
                
            }
        },
        computed: {
            //one message at a time, in the order the user would hit them
            outageProblem() {
                if (this.outage.name == null || String(this.outage.name).trim() == "") {
                    return "Give the outage a name.";
                }
                if (this.outage.alertmanager == null || this.outage.alertmanager == "") {
                    return "Choose an alertmanager.";
                }
                if (!this.outage.startsAt || !this.outage.endsAt) {
                    return "Set a start and an end.";
                }
                if (this.outage.endsAt <= this.outage.startsAt) {
                    return "The outage has to end after it starts.";
                }
                //alertmanager rejects a silence that matches nothing at all, and one
                //that matched everything would be worse
                if (this.outage.environments.length == 0 && this.outage.teams.length == 0) {
                    return "Keep at least one environment or team.";
                }
                return null;
            }
        },
        watch: {
          cortana_token: {
            handler() {
              console.log("cortana_token set on silence list: "+this.cortana_token);
            }
          },
        },
        mounted() {
            setTimeout(() => {
            console.log("*** SILENCES TIMEOUT FIRED ***");
            
            this.fetchData();
            }, 1000);

        },
        methods: {
            handleError(error) {
              this.$emit("alert", error, "error");

            },
            fetchData() {
                this.loading = true;
                let urlString = this.baseUrl;
                urlString = urlString + "alerts";

                    console.log("FETCHING: "+urlString)
                    axios.get(urlString, {headers: {"CORTANA-TOKEN": this.cortana_token}})
                    .then(response => {
                        console.log(response.data.payload);
                        this.silences = response.data.payload.silences;
                        this.alertmanagers = response.data.payload.alertmanagers;
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
            //"YYYY-MM-DDTHH:mm", which is what a datetime-local field reads and writes
            localDateTime(date) {
                const pad = n => String(n).padStart(2, "0");
                return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
                    + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
            },
            //the silence api spells its dates yyyy-MM-ddTHH:mm:ss.SSSZ
            toApiDate(local) {
                if (local == null || local == "") { return null; }
                return (local.length == 16 ? local + ":00" : local.substring(0, 19)) + ".000Z";
            },
            newOutage() {
                const now = new Date();
                const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
                this.outage.name = null;
                this.outage.alertmanager = null;
                this.outage.startsAt = this.localDateTime(now);
                this.outage.endsAt = this.localDateTime(end);
                this.outage.allEnvironments = [];
                this.outage.allTeams = [];
                this.outage.environmentLabels = ["environment"];
                this.outage.environments = [];
                this.outage.teams = [];
                this.outage.dialog = true;
            },
            fetchLabelValues() {
                const am = this.outage.alertmanager;
                if (am == null || am == "") { return; }
                this.outage.loading = true;
                axios.get(this.baseUrl + "labelvalues?alertmanager=" + encodeURIComponent(am),
                        {headers: {"CORTANA-TOKEN": this.cortana_token}})
                .then(response => {
                    const payload = response.data.payload || {};
                    this.outage.allEnvironments = payload.environments || [];
                    this.outage.allTeams = payload.teams || [];
                    this.outage.environmentLabels = payload.environmentLabels || ["environment"];
                    //an outage covers the lot until the user says otherwise, which is
                    //less work than picking them out one at a time
                    this.outage.environments = this.outage.allEnvironments.slice();
                    this.outage.teams = this.outage.allTeams.slice();
                    this.outage.loading = false;
                })
                .catch(error => {
                    this.outage.loading = false;
                    this.handleError(error);
                });
            },
            //one matcher per label, matching any of its values. Separate equality
            //matchers would be ANDed together and match nothing at all.
            //
            //allowAbsent adds an empty alternative, so the matcher also passes when the
            //alert does not carry the label. An environment can be named under either
            //of two labels and alertmanager only ever ANDs, so without it a silence on
            //both labels would need an alert to carry both and would match nothing.
            //The cost is that an alert carrying neither label is silenced too.
            outageMatcher(name, values, allowAbsent) {
                const escaped = values.map(v => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
                if (allowAbsent) { escaped.push(""); }
                return {
                    name: name,
                    value: "^(" + escaped.join("|") + ")$",
                    isRegex: true,
                    isEqual: true
                };
            },
            createOutage() {
                const matchers = [];
                if (this.outage.environments.length > 0) {
                    //only let a label be absent when there is more than one to satisfy:
                    //with a single environment label there is no AND to work around, and
                    //being permissive would silence alerts that have no environment
                    const labels = this.outage.environmentLabels;
                    labels.forEach(label => {
                        matchers.push(this.outageMatcher(label, this.outage.environments, labels.length > 1));
                    });
                }
                if (this.outage.teams.length > 0) {
                    matchers.push(this.outageMatcher("team", this.outage.teams, false));
                }
                const silence = {
                    matchers: matchers,
                    createdBy: this.cortana_user,
                    comment: String(this.outage.name).trim(),
                    id: null,
                    startsAt: this.toApiDate(this.outage.startsAt),
                    endsAt: this.toApiDate(this.outage.endsAt),
                    status: { state: "active" },
                    alertmanager: this.outage.alertmanager
                };
                axios.post(this.baseUrl + "silence", silence, {headers: {"CORTANA-TOKEN": this.cortana_token}})
                //eslint-disable-next-line no-unused-vars
                .then(response => {
                    this.fetchData();
                })
                .catch(error => {
                    this.handleError(error);
                });
            },
            newSilence() {
                this.currentSilence.id = null;
                this.currentSilence.createdBy = this.cortana_user;
                this.currentSilence.status.state = "active";
                this.currentSilence.comment = "New Silence";
                this.currentSilence.matchers = [];
                this.currentSilence.hours = 24;
                this.currentSilence.hoursLeft = 24;
                this.silence.dialog = true;
            },
            deleteSilence(id) {
                if (id == null) {
                  this.handleError("Unable to delete pending silence, refresh and try again")
                  return;
                }
                axios.delete(this.baseUrl + "silence?id="+id,{headers: {"CORTANA-TOKEN": this.cortana_token}})
                //eslint-disable-next-line no-unused-vars
                .then(response => {
                    this.fetchData();
                })
                .catch(error => {
                    this.handleError(error);
                });                
            },
            saveSilence() {
                axios.post(this.baseUrl + "silence", this.currentSilence,{headers: {"CORTANA-TOKEN": this.cortana_token}})
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
                this.currentSilence.alertmanager = item.alertmanager;

                this.currentSilence.hours = item.hours;                                                                       
                this.silence.dialog = true;
            }
        }
    }
</script>