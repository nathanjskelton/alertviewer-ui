import axios from "axios";
import { useRouter, useRoute } from 'vue-router';
import { ref, computed } from 'vue';

export default {
  
  setup() {
    const dataTable = ref([]);
    const router = useRouter();
    const query = useRoute().query;
    return {
      router,
      query,
      dataTable
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
  emits: ['alerts','alert','status','token','user','role','alertManagerStatus','lastIngest'],
  data() {
    return {
      rowsPerPage: null,
      panel: [],
      expandMode: null,
      currentJira: {
        id: null,
        summary: null,
        description: null,
        system: null,
        environment: null,
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

      autoRefresh: true,
      statuses: ['NEW'],
      sessionId: null,
      logTypes: [],
      gmInstances: [],
      search: "",
      groupField: null,
      allFields: [],
      selected: [],
      searchSeverity: [],
      searchGmInstance: [],
      searchAlertName: null,
      searchInstance: null,
      searchTeam: null,
      searchSummary: null,
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
      filterMenu: {
        alertname: false,
        instance: false,
        team: false,
        summary: false,
        severity: false,
        gm: false,
      },
      filterOptions: computed(() => {
        const filterOptionsArray = []
        filterOptionsArray.push({
          field: "alert.labels.alertname",
          criteria: this.searchAlertName,
          comparison: (value, criteria) =>
            this.getComparison(value, criteria)
        })
        filterOptionsArray.push({
          field: "alert.labels.instance",
          criteria: this.searchInstance,
          comparison: (value, criteria) =>
            this.getComparison(value, criteria)
        })
        filterOptionsArray.push({
          field: "alert.labels.team",
          criteria: this.searchTeam,
          comparison: (value, criteria) =>
            this.getComparison(value, criteria)
        })
        filterOptionsArray.push({
          field: "alert.annotations.summary",
          criteria: this.searchSummary,
          comparison: (value, criteria) =>
            this.getComparison(value, criteria)
        })
        return filterOptionsArray
      }),
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
          filterable: false,
        },
        {
          text: "GM",
          align: "center",
          sortable: true,
          value: "alert.labels.gm_instance",
          filterable: false,
        },
        {
          text: "Alertname",
          align: "center",
          sortable: true,
          value: "alert.labels.alertname",
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
          text: "Team",
          align: "center",
          sortable: true,
          value: "alert.labels.team",
          filterable: true,
        },
        {
          text: "Summary",
          align: "start",
          sortable: true,
          value: "alert.annotations.summary",
          filterable: true,
        },
      ],

      
      loading: true,
      info: [],
      testInfo: ['ALL', 'Other'],
      alertmanagers: [],
      sortBy: "alert.startsAt",
      sortType: "desc",
    };
  },
  watch: {
    expandMode: {
      handler() {
        this.setPanel(true);
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
    groupField: {
      handler() {
        this.panel=[];
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
      console.log("*** ALERTS TIMEOUT FIRED ***");
      console.log(this.dataTable);
      console.log("statuses:"+this.query.statuses);
      console.log("autoRefresh:"+this.query.autoRefresh);
      //this.autoRefresh = true;

      if (this.query.severity != null && Array.isArray(this.query.severity)) {
        this.searchSeverity = this.query.severity;
      } else if (this.query.severity) {
        this.searchSeverity = [ this.query.severity ];
      }

      if (this.query.srchAlert) {
        this.searchAlertName = this.query.srchAlert;
      }
      if (this.query.srchInst) {
        this.searchInstance = this.query.srchInst;
      }
      if (this.query.srchTm) {
        this.searchTeam = this.query.srchTm;
      }
      if (this.query.srchSmy) {
        this.searchSummary = this.query.srchSmy;
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

      if (this.query.groupField != null && this.query.groupField != '') {
        this.groupField = this.query.groupField;
      }

      if (this.query.autoRefresh == "false") {
        this.autoRefresh = false;
      } else {
        this.autoRefresh = true;
      }

      if (this.query.expandMode == null) {
        this.expandMode = 'first';
      } else {
        this.expandMode = this.query.expandMode;
      }

      if (this.query.rowsPerPage == null) {
        this.rowsPerPage = 15;
      } else {
        this.rowsPerPage = this.query.rowsPerPage;
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

    getComparison(value, criteria) {
      if (criteria == null) return true;
      const parts = criteria.split(",");
      let i = 0;
      let incl = 0;
      let excl = 0;
      let inclPossible = 0;
      while (i < parts.length) {
        let part = parts[i];
        if (value != null &&
          typeof value === "string" &&
          (!part.startsWith("!"))) {
            inclPossible++;
            if (value.includes(part)) incl++;  
        } else if (value != null &&
          typeof value === "string" &&
          (part.startsWith("!") && value.includes(part.substring(1)))) {
            excl++;
            break;
        }
        i++;
      }
      //console.log("CRITERIA:"+criteria+" value="+value+",inclPossible="+inclPossible+",incl="+incl+",excl="+excl);
      if ((incl > 0 || inclPossible == 0) && excl == 0) return true;
      return false;
    },

    getSummaryHeader(name, summary) {
        return (""+summary).split('\n')[0] + "";
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
          this.$emit("lastIngest", response.data.payload.lastIngestSecs);
          this.$emit("alertManagerStatus", response.data.payload.alertManagerStatus);

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
    getColorByPercent(pct) {
      let value = "rgba(255, 0, 0, "+(pct/100)+")";
      console.log("VALUE: "+value);
      return value;
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
      this.$emit("status", "COMMUNICATION ERROR.");
      this.$emit("lastIngest", "MANY");
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
      this.currentJira.system = item.alert.labels.gm_instance;
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
    setQueryString() {
      console.log("updating query string");
      this.router.push({
        query: {
          severity: this.searchSeverity,
          srchAlert: this.searchAlertName,
          srchInst: this.searchInstance,
          srchSmy: this.searchSummary,
          srchTm: this.searchTeam,
          statuses: this.statuses,
          gmInstances: this.searchGmInstance,
          groupField: this.groupField,
          autoRefresh: this.autoRefresh,
          expandMode: this.expandMode,
          rowsPerPage: this.rowsPerPage
        }, replace: true
      });
    },
    updateDataTables() {
      for (var i = 0; i < this.dataTable.length; i++) {
        
        this.dataTable[i].updateRowsPerPageActiveOption(this.rowsPerPage);
      }
    },
    setPanel(force) {
      var keys = Object.keys(this.info);
      if (keys[0] == 'ALL') {
        this.expandMode = 'first';
      } 
      if (this.panel == "" || force) {
        var keys = Object.keys(this.info);
        if (this.expandMode == "first") {
          this.panel = [keys[0]];
        } else if (this.expandMode == "all") {
          this.panel = keys;
        } else if (this.expandMode == "none" && force) {
          this.panel = [];
        }
      }
      this.setQueryString();
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

      if (this.searchAlertName != null && this.searchAlertName.length > 0) {
        urlString = urlString + delim + "srchAlert=" + this.searchAlertName;
        delim = "&";
      }
      if (this.searchInstance != null && this.searchInstance.length > 0) {
        urlString = urlString + delim + "srchInst=" + this.searchInstance;
        delim = "&";
      }
      if (this.searchTeam != null && this.searchTeam.length > 0) {
        urlString = urlString + delim + "srchTm=" + this.searchTeam;
        delim = "&";
      }
      if (this.searchSummary != null && this.searchSummary.length > 0) {
        urlString = urlString + delim + "srchSmy=" + this.searchSummary;
        delim = "&";
      }


      if (this.searchGmInstance != null && this.searchGmInstance.length > 0) {
        urlString = urlString + delim + "gmInstances=" + this.searchGmInstance;
        delim = "&";
      }

      if (this.groupField != null && this.groupField != "") {
        urlString = urlString + delim + "groupField=" + this.groupField;
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
            this.payload.allFields.forEach(value => {
              this.allFields.push(value);
            })
            
            
            this.setQueryString();
            this.setPanel(false);
          
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
