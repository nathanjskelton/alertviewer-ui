import axios from "axios";
import { useRouter, useRoute } from 'vue-router';

export default {
  
  setup() {
    const router = useRouter();
    const query = useRoute().query;
    return {
      router,
      query
    }
  },
  name: "ResultList",
  props: {
    results: String,
    cortana_token: String,
    cortana_user: String,
    cortana_role: String,
  },
  computed: {
    
  },
  emits: ['alerts','alert','status','token','user','role','alertManagerStatus'],
  data() {
    return {
      currentJira: {
        id: null,
        summary: null,
        description: null,
      },

      jira: {
        dialog: false,
      },

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
      alertDetails: {
        dialog: false,
        item: null,
      },      
      silence: {
        dialog: false,
      },
      silences: [],

      autoRefresh: false,
      statuses: ['NEW'],
      sessionId: null,
      logTypes: [],
      gmInstances: [],
      search: "",
      selected: [],
      searchSeverity: [],
      searchGmInstance: [],
      searchValue: "",
      searchField: ["alert.labels.instance","alert.annotations.service","alert.labels.alertname"],
      showDrawer: true,
      refreshStyle: "",
      dialog: false,
      copyDialog: {
        dialog: false,
        title: "",
        text: ""
      },
      note: {
        dialog: false,
        id: null,
        message: null,
        caption: "Add a note to the record",
        prefix: "Note"
      },
 
      editItem: {
        id: null,
        message: null,
        dialog: false
      },

      deleteDisabled: true,
      name: "Alerts",
      expanded: [],
      headers: [
        {
          text: "",
          align: "start",
          sortable: false,
          value: "actions",
          filterable: false
        },        
        {
          text: "",
          align: "center",
          sortable: false,
          value: "icon",
          filterable: false,
        },
        {
          text: "Duration",
          align: "center",
          sortable: true,
          value: "alert.startsAt",
          filterable: false,
        },
        {
          text: "Severity",
          align: "center",
          sortable: true,
          value: "alert.labels.severity",
          filterable: true,
        },
        {
          text: "GM",
          align: "center",
          sortable: true,
          value: "alert.labels.gm_instance",
          filterable: false,
        },
        {
          text: "System",
          align: "center",
          sortable: true,
          value: "alert.labels.system",
          filterable: true,
        },
        {
          text: "Service",
          align: "center",
          sortable: true,
          value: "alert.annotations.service",
          filterable: true,
        },
        {
          text: "Instance",
          align: "center",
          sortable: true,
          value: "alert.labels.instance",
          filterable: true,
        },
        {
          text: "Message",
          align: "start",
          sortable: true,
          value: "alert.labels.alertname",
          filterable: true,
        },
      ],

      
      loading: true,
      info: [],
      alertmanagers: [],
      sortBy: "alert.startsAt",
      sortType: "desc",
    };
  },
  watch: {
    searchValue: {
      handler() {
        if (this.searchValue == null) { this.searchValue = ''; }
      }
    },
    cortana_token: {
      handler() {
        console.log("cortana_token set on result list: "+this.cortana_token);
      }
    },
    statuses: {
      handler() {

        if (this.statuses == null || this.statuses.length == 0 ||
            (this.statuses.length == 1 && this.statuses[0] == "FLAPPING") ) {
          this.statuses.push('NEW');
        }

        if (this.autoRefresh) {
          this.fetchData();
        } else {
          this.refreshStyle = "orange";
        }
      }
    },
    searchSeverity: {
      handler() {
        if (this.autoRefresh) {
          this.fetchData();
        } else {
          this.refreshStyle = "orange";
        }
      }
    },
    searchGmInstance: {
      handler() {
        if (this.autoRefresh) {
          this.fetchData();
        } else {
          this.refreshStyle = "orange";
        }
      }
    },    
    dialog: {
      handler() {
        if (this.dialog) {
          //console.log("dialog was open");
        }
      },
      deep: true
    }
  },
  mounted() {
    window.console.log("**** STARTING ****");
    this.login();
    

    setTimeout(() => {
      console.log("*** ALERTS TIMEOUT FIRED ***")
      console.log("statuses:"+this.query.statuses);
      console.log("autoRefresh:"+this.query.autoRefresh);
      this.autoRefresh = true;
      if (this.query.type != null && Array.isArray(this.query.type)) {
        this.searchSeverity = this.query.type;
      } else if (this.query.type) {
        this.searchSeverity = [ this.query.type ];
      }

      if (this.query.gmInstances != null && Array.isArray(this.query.gmInstances)) {
        this.searchGmInstance = this.query.gmInstances;
      } else if (this.query.gmInstances) {
        this.searchGmInstance = [ this.query.gmInstances ];
      }

      if (this.query.statuses != null && Array.isArray(this.query.statuses)) {
        this.statuses = this.query.statuses;
      } else if (this.query.statuses) {
        this.statuses = [ this.query.statuses ];
      }

      if (this.query.autoRefresh == "true") {
        this.autoRefresh = true;
      } else {
        this.autoRefresh = false;
      }
      
      this.poll();
      this.fetchData();
    }, 1000);

    setInterval(() => {
      this.poll();
    }, 5000);

    setInterval(() => {
      this.autoFetchData();
    }, 15000);

  },
 
  methods: {
    //TEST
    genRandomIndex (length) {
      return Math.ceil(Math.random() * (length - 1))
    },

    //END TEST

    getSummaryHeader(name, summary) {
        return name+": "+(""+summary).split('\n')[0] + "";
    },
    autoFetchData() {
      if (this.autoRefresh) { this.fetchData(); }
    },

    login() {
      console.log("logging in, url is " + this.baseUrl + "login");
      axios
        .get(this.baseUrl + "login")
        .then(response => {
          console.log("login response "+response.headers['cortana-user']+"/"+response.headers['cortana-role'])
          this.$emit("token", response.headers['cortana-token']);
          this.$emit('user', response.headers['cortana-user']);
          this.$emit("role", response.headers['cortana-role']);
          console.log("HEADERS "+response.headers)
        });
    },

    poll() {
      console.log("POLLING: "+this.baseUrl)
      axios
        .get(this.baseUrl + "poll", {headers: {"CORTANA-TOKEN": this.cortana_token}})
        .then(response => {
          this.sessionId = response.data.payload.sessionId;
          //this.$emit("alerts", response.data.payload.messageStack); 
          this.$emit("status", response.data.payload.statusMessage);
          this.$emit("alertManagerStatus", response.data.payload.alertManagerStatus);
          
          if (response.data.payload.dataStale) {
            this.refreshStyle = "red lighten-1";
          }

        })
        .catch(error => {
          this.handleError(error);
        });
    },
    toggleDrawer() {
      if (this.showDrawer == false) {
        this.showDrawer = true;
      } else {
        this.showDrawer = false;
      }
    },
    getTimeSince(item) {
      let date1 = new Date(item.lastOccurence);
      let dateNow = new Date();
      let days = Math.trunc((dateNow - date1) / (1000 * 3600 * 24));
      let hours = Math.trunc((dateNow - date1) / (1000 * 3600));
      let minutes = Math.trunc((dateNow - date1) / (1000 * 60));
      if (hours == 0) {
        return minutes + "m";
      }
      if (hours >= 24) {
        return days + "d";
      }
      return hours + "h";
    },
    getSeverityColor(item) {
      if (item.alert.labels.severity == "critical") {
        return "red lighten-1";
      }
      if (item.alert.labels.severity == "warning") {
        return "orange lighten-1";
      }
      return "gray";
    },
    getLastOccColor(item) {
      let color = "gray";
      let date1 = new Date(item.lastOccurence);
      let dateNow = new Date();
      let days = Math.trunc((dateNow - date1) / (1000 * 3600 * 24));
      let hours = Math.trunc((dateNow - date1) / (1000 * 3600));
      if (days == 1) {
        return "yellow";
      }
      if (days == 0) {
        color = "orange";
      }
      if (hours == 0) {
        color = "red lighten-1";
      }
      return color;
    },

    handleError(error) {
      this.$emit("alert", error, "error");
      this.login();

    },
    onSuccess(response) {
      if (response && response.data && response.data.message) {
        this.$emit("alert", response.data.message, "success");
      }
    },
    mark(item, value) {
      axios
        .put(this.baseUrl + "mark", "id=" + item.id + "&status=" + value ,{headers: {"CORTANA-TOKEN": this.cortana_token}})
        .then(response => {
          this.onSuccess(response);
          this.fetchData();

        })
        .catch(error => {
          this.handleError(error);
        });
    },
    deleteRecord(id) {
      axios
        .delete(this.baseUrl + "alert?id=" + id, {headers: {"CORTANA-TOKEN": this.cortana_token}})
        .then(response => {
          this.onSuccess(response);
          this.fetchData();
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    saveNote() {
      axios
        .post(this.baseUrl + "note?id=" + this.note.id, this.note.prefix + ": " + this.note.message, {
          headers: {
            "Content-Type": "text/plain",
            "CORTANA-TOKEN": this.cortana_token
          }
        })
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
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
    newSilence(item) {
      this.currentSilence.comment = "Silence "+item.alert.labels.alertname;
      this.currentSilence.alertmanager = item.alertmanager;
      this.currentSilence.id = null;
      this.currentSilence.createdBy = this.cortana_user;
      this.currentSilence.status.state = "active";
      this.currentSilence.matchers = [];
      for (const property in item.alert.labels) {      
        this.currentSilence.matchers.push(
          {
            name: `${property}`,
            value: `${item.alert.labels[property]}`,
            isEqual: true
          });
      }
      this.currentSilence.hours = 24;
    },
    saveSilence() {
      axios
        .post(this.baseUrl + "silence", this.currentSilence, {headers: {"CORTANA-TOKEN": this.cortana_token}})
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    newJira(item) {
      this.currentJira.id = "cortana:" + item.alert.fingerprint;
      this.currentJira.description = item.alert.annotations.summary;
      this.currentJira.summary = "Cortana: " + item.alert.labels.alertname;
      this.jira.dialog = true;
    },
    saveJira() {
      axios
        .post(this.baseUrl + "jira", this.currentJira,{headers: {"CORTANA-TOKEN": this.cortana_token}})
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    copyDialogText() {
      let textToCopy = this.$refs.copydialog.$el.querySelector('textarea');
      textToCopy.select()
      document.execCommand('copy');
      this.copyDialog.dialog = false;
      this.copyDialog.text = '';
      this.copyDialog.title = '';
    },
    fetchData(asExport) {
      this.expanded = []
      this.loading = true;
      this.refreshStyle = "";
      let delim = "?";
      let urlString = this.baseUrl;

      if (asExport) {
        urlString = urlString + "export";
      } else {
        urlString = urlString + "alerts";
      }

      if (this.statuses != null && this.statuses.length > 0) {
        urlString = urlString + delim + "statuses=" + this.statuses;
        delim = "&";
      }

      if (this.searchSeverity != null && this.searchSeverity.length > 0) {
        urlString = urlString + delim + "severity=" + this.searchSeverity;
        delim = "&";
      }

      if (this.searchGmInstance != null && this.searchGmInstance.length > 0) {
        urlString = urlString + delim + "gminstances=" + this.searchGmInstance;
        delim = "&";
      }
      
      if (asExport) {
        window.open(urlString, "_blank");
        this.loading=false;
      } else {
        console.log("FETCHING: "+urlString)
        axios
          .get(urlString, {headers: {"CORTANA-TOKEN": this.cortana_token}})
          .then(response => {
            console.log(response.data.payload);
            this.payload = response.data.payload;
            this.silences = response.data.payload.silences;
            this.alertmanagers = response.data.payload.alertmanagers;
            this.info = response.data.payload.entries;
            //this.info.forEach(item => {
            //  this.expanded.push(item.id);
            //})
            this.logTypes = []
            this.payload.severities.forEach(value => {
              this.logTypes.push(value);
            })
            this.gmInstances = []
            this.payload.instances.forEach(value => {
              this.gmInstances.push(value);
            })
            
            
            this.router.push({
              query: {
                severity: this.searchSeverity,
                statuses: this.statuses,
                gminstances: this.searchGmInstance,
                autoRefresh: this.autoRefresh
              }, replace: true
            });
          
          
            this.loading = false;
          })
          .catch(error => {
            console.log(error);
            this.handleError(error);
            this.loading = false;
          })
      }

    }
  }
};
