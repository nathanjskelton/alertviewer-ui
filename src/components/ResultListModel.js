import axios from "axios";
import { useRouter, useRoute } from 'vue-router';
import { ref, computed } from 'vue';
import AlertGantt from './AlertGantt.vue';
import { DEFAULT_RETENTION_MINUTES } from './timelineWindow';
import { receiverNamesOf, buildReceiverIndex, lookupReceiver, actionIcon } from './receivers';

export default {
  components: { AlertGantt },
  
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
    timeline_selection: Object,
  },
  computed: {
    // Firing windows for the footer timeline, one entry per alert on screen.
    // end == null means "still firing", so the graph can extend the bar to its
    // own idea of now instead of the moment this was last recomputed.
    alertIntervals() {
      const now = Date.now();
      const windowStart = now - this.retentionMinutes * 60000;
      const out = [];
      this.eachVisibleAlert((item, firing) => {
        if (firing.end != null && firing.end < windowStart) {
          return;
        }
        // Count only the stretches the alert was actually notifying. Dropping a
        // silenced alert whole would erase the hours it fired before anyone muted
        // it; counting it whole puts a hump in the graph for something deliberately
        // turned off. Neither is what the line is meant to show.
        const quiet = this.silencedWindows(item, firing);
        this.unsilencedParts(firing, quiet, now).forEach(part => {
          if (part.end != null && part.end < windowStart) {
            return;
          }
          out.push({ start: part.start, end: part.end, severity: item.alert.labels.severity });
        });
      });
      return out;
    },
    // Rows for the gantt view: every alert that was firing at any point inside
    // the window scrubbed on the footer timeline, oldest first.
    selectionRows() {
      const selection = this.timeline_selection;
      if (selection == null) {
        return [];
      }
      const now = Date.now();
      const rows = [];
      this.eachVisibleAlert((item, firing) => {
        const end = firing.end == null ? now : firing.end;
        if (firing.start > selection.end || end < selection.start) {
          return;
        }
        const quiet = this.silencedWindows(item, firing);
        // whether any of this alert's unsilenced time falls inside the window being
        // looked at. If none does, it was muted throughout and is hidden by default
        const notifying = this.unsilencedParts(firing, quiet, now).some(part => {
          const partEnd = part.end == null ? now : part.end;
          return part.start < selection.end && partEnd > selection.start;
        });
        rows.push({
          id: item.id,
          alertname: item.alert.labels.alertname,
          environment: item.alert.labels.environment,
          instance: item.alert.labels.instance,
          severity: item.alert.labels.severity,
          summary: this.getSummaryHeader(item.alert.labels.alertname, item.alert.annotations.summary),
          status: item.status,
          // carried rather than filtered out here: the gantt hides fully silenced
          // rows by default but can show them, and it hatches the muted stretches of
          // the ones it does show
          silenced: !notifying,
          silencedWindows: quiet,
          start: firing.start,
          end: firing.end,
        });
      });
      rows.sort((a, b) => a.start - b.start);
      return rows;
    }
  },
  emits: ['alerts','alert','status','token','user','role','banner','retention','alertManagerStatus','lastIngest','alertIntervals','closeTimeline'],
  data() {
    return {
      // How far back the backend still keeps RESOLVED alerts. Replaced by the
      // real value from the login response; until then the default keeps the
      // interval filter from trimming history the graph may be about to ask for.
      retentionMinutes: DEFAULT_RETENTION_MINUTES,
      // Resolved alerts the status filter excluded, in the backend's cut-down
      // AlertHistory shape. Graph and gantt only -- they are not table rows and
      // do not carry enough fields to be one. Empty when the filter already
      // includes RESOLVED, since `info` then holds them in full.
      history: [],
      rowsPerPage: null,
      // "NOT CALLIN" in the Attributes filter: ticked means don't care about the
      // callin label and show every alert; unticked narrows to callin alerts
      // only. Ticked by default so links made before this filter existed, and
      // plain visits, still show everything.
      notCallin: true,
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
        // 'create' makes a new ticket through wraith, 'link' just records a key
        // the user already has. Defaults to whichever makes sense for the row.
        mode: 'create',
        // the alert the dialog was opened on, and the key it already carries
        item: null,
        currentKey: null,
        // key typed in for 'link'
        linkKey: '',
      },

      // Alertmanager routing config, fetched once after login. Only used to say
      // what a receiver does; the receivers an alert was routed to come from the
      // alert itself, so this staying empty degrades the panel rather than breaking it.
      routing: {
        alertmanagers: [],
        index: {},
        loaded: false,
      },

      // "Rebuild Jira Links" in the left drawer: confirmation dialog, and a
      // spinner on the button while the backend walks every alert. `clear` is the
      // dialog's tickbox and starts off every time the dialog opens: dropping the
      // links of alerts no ticket claims has to be asked for, not defaulted into.
      jiraRebuild: {
        dialog: false,
        running: false,
        clear: false,
      },

      // Base of the jira instance, from the login response. Empty until then,
      // and empty if the backend has no jira.base.url configured, which is what
      // keeps the ticket icon from offering a link that goes nowhere.
      jiraBaseUrl: '',
      //jira runs through wraith. With none configured the server says so and every
      //jira control comes off the screen rather than sitting there doing nothing
      jiraEnabled: false,

      // Prefix the backend puts on the jira label that carries the fingerprint.
      // Same value the rebuild searches on, so the details panel shows the label
      // exactly as it appears on the ticket.
      jiraLabelPrefix: 'alertmanager',

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
      annotationsDialog: {
        dialog: false,
        item: null,
      },
      silence: {
        dialog: false,
      },
      silences: [],

      //bumped to force the group tables to remount; see firstPage()
      tableEpoch: 0,
      autoRefresh: true,
      showExtraLabels: false,
      alertManagerStatus: {},
      statuses: ['NEW'],
      sessionId: null,
      logTypes: [],
      environments: [],
      search: "",
      groupField: null,
      allFields: [],
      selected: [],
      searchSeverity: [],
      searchEnvironment: [],
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
      // Per-group counts/duration that respect the same client-side filters
      // the table applies, so empty/partial groups aren't misrepresented.
      groupStats: computed(() => {
        const stats = {};
        const now = new Date();
        Object.keys(this.info).forEach(key => {
          const group = this.info[key];
          const list = this.applyClientFilters(group.list || []);
          let firing = 0;
          let maxMs = 0;
          let newCount = 0;
          let staleCount = 0;
          const sevSet = new Set();
          const teamSet = new Set();
          const gmSet = new Set();
          list.forEach(item => {
            if (this.isStale(item)) {
              staleCount++;
            }
            if (item.status == "NEW" && !item.acked) {
              firing++;
              const ms = now - new Date(item.alert.startsAt);
              if (ms > maxMs) {
                maxMs = ms;
              }
              if (ms <= 10 * 60 * 1000) {
                newCount++;
              }
            }
            const sev = item.alert.labels.severity;
            if (sev != null && sev !== "") sevSet.add(sev);
            const team = item.alert.labels.team;
            if (team != null && team !== "") teamSet.add(team);
            const gm = item.alert.labels.environment;
            if (gm != null && gm !== "") gmSet.add(gm);
          });
          stats[key] = {
            total: list.length,
            firing: firing,
            firingFor: maxMs > 0 ? this.humanizeDuration(maxMs) : null,
            newCount: newCount,
            staleCount: staleCount,
            severities: [...sevSet],
            teams: [...teamSet],
            environments: [...gmSet],
          };
        });
        return stats;
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
          text: "Environment",
          align: "center",
          sortable: true,
          value: "alert.labels.environment",
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
    alertIntervals: {
      immediate: true,
      handler(value) {
        this.$emit("alertIntervals", value);
      }
    },
    expandMode: {
      handler() {
        this.setPanel(true);
      }
    },
    cortana_token: {
      handler() {
        console.log("cortana_token set on result list: "+this.cortana_token);
        //the token is emitted up and handed back as a prop, so it is not set yet
        //when login() returns; fetch the routing config once it has actually arrived
        if (this.cortana_token) { this.fetchRoutes(); }
      }
    },
    statuses: {
      handler() {

        //FLAPPING and JIRA name an attribute rather than a state, so ticked on their
        //own they leave the query with no status to match. Keep FIRING ticked so the
        //table shows something rather than going blank
        const attributes = ["FLAPPING", "JIRA", "ACKED"];
        if (this.statuses == null) {
          this.statuses = ['NEW'];
        } else if (!this.statuses.some(s => !attributes.includes(s))) {
          this.statuses.push('NEW');
        }

        if (this.autoRefresh) {
          this.fetchData();
        } else {
          this.refreshStyle = "orange";
        }
      }
    },
    notCallin: {
      handler() {
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
    searchEnvironment: {
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

      if (this.query.environments != null && Array.isArray(this.query.environments)) {
        this.searchEnvironment = this.query.environments;
      } else if (this.query.environments) {
        this.searchEnvironment = [ this.query.environments ];
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

      //only an explicit notCallin=false narrows to callin alerts; anything else,
      //including the param being absent, leaves it ticked and shows everything
      if (this.query.notCallin == "false") {
        this.notCallin = false;
      } else {
        this.notCallin = true;
      }

      if (this.query.showLabels == "true") {
        this.showExtraLabels = true;
      } else {
        this.showExtraLabels = false;
      }

      if (this.query.grpExpMode == null) {
        this.expandMode = 'none';
      } else {
        this.expandMode = this.query.grpExpMode;
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
    //back to the default view. The tables page independently of the filters, so a
    //clear that left them on page 4 would show an empty table over a full result set
    clearFilters() {
      this.searchAlertName = null;
      this.searchTeam = null;
      this.searchInstance = null;
      this.searchSummary = null;
      this.searchEnvironment = [];
      this.searchSeverity = [];
      this.environments = [];
      this.panel = [];
      this.groupField = null;
      this.statuses = ['NEW', 'FLAPPING'];
      this.firstPage();
    },
    //Remount the group tables, which starts their pagination over.
    //
    //Asking them directly does not work: EasyDataTable's updatePage() returns without
    //doing anything while its loading prop is set, and clearing the filters kicks off
    //a refetch that sets exactly that. The table's key carries this counter, so
    //bumping it rebuilds the tables on page one whatever else is in flight.
    firstPage() {
      this.tableEpoch++;
    },
    autoFetchData() {
      if (this.autoRefresh) { this.fetchData(false, true); }
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
          this.$emit("banner", response.headers['cortana-banner']);
          const retention = Number(response.headers['cortana-retention']);
          if (isFinite(retention) && retention > 0) { this.retentionMinutes = retention; }
          this.$emit("retention", this.retentionMinutes);
          this.jiraBaseUrl = response.headers['cortana-jira-url'] || '';
          this.jiraEnabled = String(response.headers['cortana-jira-enabled'] || '') == 'true';
          this.jiraLabelPrefix = response.headers['cortana-jira-label-prefix'] || 'alertmanager';
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
          // Keep a local copy so rows can flag alerts from an offline
          // alertmanager (i.e. potentially stale) data.
          this.alertManagerStatus = response.data.payload.alertManagerStatus;

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
      return this.getSeverityColorByValue(item.alert.labels.severity);
    },
    getSeverityColorByValue(severity) {
      if (severity == "critical") {
        return "red lighten-1";
      }
      if (severity == "warning") {
        return "orange lighten-1";
      }
      return "gray";
    },
    getGroupSeverityColor(severities) {
      // Color the group by its highest severity (critical > warning > other).
      if (severities != null && severities.includes("critical")) {
        return this.getSeverityColorByValue("critical");
      }
      if (severities != null && severities.includes("warning")) {
        return this.getSeverityColorByValue("warning");
      }
      return this.getSeverityColorByValue(null);
    },
    headerItemClassName(header) {
      // Center the header for columns whose body cells are centered
      // (Summary is left-aligned, so it is intentionally excluded).
      const centered = [
        "alert.startsAt",
        "alert.labels.severity",
        "alert.labels.environment",
        "alert.labels.alertname",
        "alert.labels.instance",
        "alert.labels.team",
      ];
      return centered.includes(header.value) ? "center-header" : "";
    },
    getExtraLabels(item) {
      // Labels that already have their own column are skipped; everything
      // else is surfaced as a chip below the row.
      const skipLabels = ["severity", "environment", "alertname", "instance", "team", "service"];
      let tags = [];
      let labels = (item.alert && item.alert.labels) || {};
      Object.keys(labels).forEach(k => {
        if (!skipLabels.includes(k) && labels[k] != null && labels[k] !== "") {
          tags.push({ key: k, value: labels[k] });
        }
      });
      return tags;
    },
    getExtraAnnotations(item) {
      // Annotations other than the ones shown/used in columns.
      const skipAnnotations = ["summary", "service", "environment_from_am"];
      let tags = [];
      let annotations = (item.alert && item.alert.annotations) || {};
      Object.keys(annotations).forEach(k => {
        if (!skipAnnotations.includes(k) && annotations[k] != null && annotations[k] !== "") {
          tags.push({ key: k, value: annotations[k] });
        }
      });
      return tags;
    },
    getLabelColor(label) {
      // Deterministically pick a color from a palette based on the key name,
      // so the same label always gets the same color across rows.
      const palette = [
        "red", "pink", "purple", "deep-purple", "indigo",
        "blue", "cyan", "teal", "green", "light-green",
        "amber", "orange", "deep-orange", "brown", "blue-grey",
      ];
      let hash = 0;
      for (let i = 0; i < label.length; i++) {
        hash = (hash * 31 + label.charCodeAt(i)) & 0xffffffff;
      }
      return palette[Math.abs(hash) % palette.length];
    },
    groupTitle(key) {
      // Show only the group value; the field name is redundant with the
      // "Group by Field" selector in the sidebar. Strips a leading
      // "<groupField><separator>" prefix if the backend includes one.
      if (key == null || key == "ALL") {
        return key;
      }
      let field = this.groupField;
      if (field != null && field != "") {
        let escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        let re = new RegExp("^" + escaped + "[\\s:=/-]+", "i");
        return key.replace(re, "");
      }
      return key;
    },
    isStale(item) {
      // An alert is potentially stale when the alertmanager it came from is
      // currently offline (alertManagerStatus maps am name -> true/false).
      if (item == null || item.alertmanager == null) {
        return false;
      }
      return this.alertManagerStatus[item.alertmanager] === false;
    },
    bodyRowClassName(item) {
      // Stale (offline alertmanager) takes precedence and greys the row.
      if (this.isStale(item)) {
        return "stale-row";
      }
      // Freshly firing alerts get a red highlight that fades with age. An acked one
      // is already being dealt with, so it does not shout for attention.
      if (item.status == "NEW" && !item.acked) {
        const ms = new Date() - new Date(item.alert.startsAt);
        if (ms <= 60 * 1000) {
          return "firing-new-row";
        }
        if (ms <= 10 * 60 * 1000) {
          return "firing-recent-row";
        }
      }
      return "";
    },
    // The window an alert was actually firing for. end == null means "still
    // firing". Both halves of the record matter: a RESOLVED entry has stopped
    // firing even though alertmanager left endsAt in the future (it is pushed
    // out by the resolve timeout while an alert is active, or parked at the
    // zero date), and an endsAt already in the past means the alert stopped
    // whatever status the viewer still carries for it.
    firingWindow(item) {
      const start = new Date(item.alert.startsAt).getTime();
      if (isNaN(start)) {
        return null;
      }
      const now = Date.now();
      const end = new Date(item.alert.endsAt).getTime();
      const ended = isNaN(end) || end <= start ? null : Math.min(end, now);
      if (item.status == "RESOLVED") {
        return { start: start, end: ended == null ? now : ended };
      }
      return { start: start, end: ended != null && ended < now ? ended : null };
    },
    // Walk every alert the server returned -- the grouped entries plus the
    // resolved-only history -- with its firing window resolved. Shared by the
    // timeline graph and the gantt view so the two can never disagree.
    //
    // The history half is what keeps the graph populated while the viewer is
    // looking at a FIRING-only list; it is empty whenever `info` already holds
    // the resolved alerts, so nothing is ever counted twice. The search filters
    // apply to both, so narrowing by name narrows the graph with it.
    eachVisibleAlert(callback) {
      const visit = list => {
        this.applyClientFilters(list).forEach(item => {
          const firing = this.firingWindow(item);
          if (firing != null) {
            callback(item, firing);
          }
        });
      };
      Object.keys(this.info).forEach(key => visit((this.info[key] || {}).list || []));
      visit(this.history || []);
    },
    isSilenced(item) {
      return item != null && item.status == "SILENCED";
    },
    // The status a system note is announcing, or null if it announces none. The
    // record only keeps one current status, so these notes are the only history of
    // what an alert was doing and when. Every message that moves the status is here:
    // miss one that ends a silence and the alert reads as muted ever after.
    noteStatus(message) {
      const text = String(message == null ? '' : message);
      if (text == 'Alert is SILENCED') { return 'SILENCED'; }
      if (text == 'Previously SILENCED alert is now NEW') { return 'NEW'; }
      if (text == 'Previously RESOLVED alert is now NEW') { return 'NEW'; }
      if (text == 'Alert is now RESOLVED') { return 'RESOLVED'; }
      // a silenced alert that stops firing goes straight to RESOLVED, and the mark
      // endpoint writes every user-driven change the same way
      const marked = text.match(/^Status set to ([A-Z]+)$/);
      return marked == null ? null : marked[1];
    },
    // A note's timestamp in ms, on the same clock as the alert timestamps it gets
    // compared against.
    //
    // Both are server LocalDateTimes, but they reach us spelled differently. Alert
    // times carry a @JsonFormat whose pattern ends in a quoted 'Z', so a wall clock
    // arrives as "...T14:30:00.000Z" and the browser reads it as UTC. Notes have no
    // such format, so the same wall clock arrives as "...T14:30:00.123" and the
    // browser reads it as local. Left alone the two are offset by the viewer's own
    // timezone -- and east of UTC the notes land before the alert even started,
    // which made a silence swallow the whole firing window and drop the alert out of
    // the graph. So read a bare note time as UTC, the way alert times already are.
    noteTime(note) {
      const raw = note == null ? null : note.timestamp;
      if (raw == null) { return null; }
      // jackson can also emit a LocalDateTime as [y, m, d, h, mi, s, nano]
      if (Array.isArray(raw)) {
        const ms = Date.UTC(raw[0], (raw[1] || 1) - 1, raw[2] || 1,
            raw[3] || 0, raw[4] || 0, raw[5] || 0);
        return isFinite(ms) ? ms : null;
      }
      const text = String(raw).trim();
      const zoned = /(Z|[+-]\d{2}:?\d{2})$/.test(text) ? text : text + 'Z';
      const ms = new Date(zoned).getTime();
      return isFinite(ms) ? ms : null;
    },
    // When this alert was silenced, as [{start, end}] clipped to its firing window.
    // end == null means it was still silenced when the window ended.
    silencedWindows(item, firing) {
      const now = Date.now();
      const windowEnd = firing.end == null ? now : firing.end;
      const notes = (item && item.notes) ? item.notes : [];
      const events = [];
      for (let i = 0; i < notes.length; i++) {
        const status = this.noteStatus(notes[i].message);
        if (status == null) { continue; }
        const at = this.noteTime(notes[i]);
        if (at != null) { events.push({ at: at, status: status }); }
      }
      // notes come back newest first, and a silence only makes sense read forwards
      events.sort((a, b) => a.at - b.at);

      const out = [];
      let openedAt = null;
      events.forEach(event => {
        if (event.status == 'SILENCED') {
          if (openedAt == null) { openedAt = event.at; }
        } else if (openedAt != null) {
          out.push({ start: Math.max(openedAt, firing.start), end: Math.min(event.at, windowEnd) });
          openedAt = null;
        }
      });
      if (openedAt != null) {
        out.push({ start: Math.max(openedAt, firing.start), end: firing.end });
      }

      // The status is the truth about now, so if the notes never accounted for the
      // alert being silenced, trust it over them. An alert already suppressed when it
      // was first seen only gets its note on the next cycle, and lastChange is the
      // moment its status moved.
      if (this.isSilenced(item) && openedAt == null) {
        const since = Number(item.lastChange);
        out.push({
          start: (isFinite(since) && since > firing.start) ? since : firing.start,
          end: firing.end
        });
      }
      return out.filter(w => (w.end == null ? windowEnd : w.end) > w.start);
    },
    // The parts of a firing window left once the silenced stretches are cut out of
    // it. An alert silenced halfway through was genuinely notifying until then.
    unsilencedParts(firing, silenced, now) {
      const windowEnd = firing.end == null ? now : firing.end;
      let parts = [{ start: firing.start, end: firing.end }];
      silenced.forEach(quiet => {
        const quietStart = quiet.start;
        const quietEnd = quiet.end == null ? windowEnd : quiet.end;
        const next = [];
        parts.forEach(part => {
          const partEnd = part.end == null ? windowEnd : part.end;
          if (quietEnd <= part.start || quietStart >= partEnd) {
            next.push(part);
            return;
          }
          if (quietStart > part.start) { next.push({ start: part.start, end: quietStart }); }
          // the tail keeps a null end, so an alert still firing after a silence
          // ended still reads as ongoing rather than stopping at the silence
          if (quietEnd < partEnd) { next.push({ start: quietEnd, end: part.end }); }
        });
        parts = next;
      });
      return parts.filter(part => (part.end == null ? windowEnd : part.end) > part.start);
    },
    applyClientFilters(list) {
      // Mirror the EasyDataTable filterOptions so header stats match the
      // rows actually shown (severity/gm are server-side, so already applied).
      return (list || []).filter(item =>
        this.getComparison(item.alert.labels.alertname, this.searchAlertName) &&
        this.getComparison(item.alert.labels.instance, this.searchInstance) &&
        this.getComparison(item.alert.labels.team, this.searchTeam) &&
        this.getComparison(item.alert.annotations.summary, this.searchSummary)
      );
    },
    humanizeDuration(ms) {
      let totalMin = Math.floor(ms / 60000);
      let days = Math.floor(totalMin / 1440);
      let hours = Math.floor((totalMin % 1440) / 60);
      let mins = totalMin % 60;
      if (days > 0) {
        return days + "d " + hours + "h";
      }
      if (hours > 0) {
        return hours + "h " + mins + "m";
      }
      return mins + "m";
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
      this.currentJira.system = item.alert.labels.environment;
      this.jira.item = item;
      this.jira.currentKey = item.jiraKey || null;
      //an alert that already has a ticket is far more likely to be getting
      //pointed at a different one than to want a second ticket raised
      this.jira.mode = item.jiraKey ? 'link' : 'create';
      this.jira.linkKey = item.jiraKey || '';
      this.jira.dialog = true;
    },
    //the dialog's one Submit: make a ticket, or record one the user already has
    submitJira() {
      if (this.jira.mode == 'link') { this.linkJira(); } else { this.saveJira(); }
    },
    saveJira() {
      axios
        .post(this.baseUrl + "jira", this.currentJira,{headers: {"CORTANA-TOKEN": this.cortana_token}})
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.onSuccess(response);
          //the backend stored the new ticket key against the alert, so re-read
          //the rows to bring the ticket icon in
          this.fetchData();
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    //point the alert at a ticket that already exists, replacing any current one
    linkJira() {
      const id = this.jira.item ? this.jira.item.id : null;
      const key = (this.jira.linkKey || '').trim();
      if (id == null || key == '') { return; }
      axios
        .post(this.baseUrl + "jira/link?id=" + encodeURIComponent(id), key, {
          headers: {
            "Content-Type": "text/plain",
            "CORTANA-TOKEN": this.cortana_token
          }
        })
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.onSuccess(response);
          this.fetchData();
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    //re-point every alert at the ticket jira labels with its fingerprint. Admin
    //only, and only reached through the confirmation dialog, which is also where
    //the tickbox for dropping the links no ticket claims lives.
    rebuildJiraLinks() {
      this.jiraRebuild.dialog = false;
      this.jiraRebuild.running = true;
      axios
        .post(this.baseUrl + "jira/rebuild?clear=" + (this.jiraRebuild.clear ? "true" : "false"), null,
          {headers: {"CORTANA-TOKEN": this.cortana_token}})
        .then(response => {
          this.jiraRebuild.running = false;
          this.onSuccess(response);
          //the links moved under the rows, so re-read them to bring the ticket icons in line
          this.fetchData();
        })
        .catch(error => {
          this.jiraRebuild.running = false;
          this.handleError(error);
        });
    },
    //the label an alert's ticket carries in jira, as it appears on the ticket
    jiraLabel(item) {
      if (item == null || item.id == null) { return null; }
      return this.jiraLabelPrefix + ":" + item.id;
    },
    //url for a key typed into the dialog, so the user can check it before linking
    jiraUrlForKey(key) {
      const k = (key || '').trim();
      if (k == '' || !this.jiraBaseUrl) { return null; }
      return this.jiraBaseUrl.replace(/\/+$/, '') + "/browse/" + k.toUpperCase();
    },
    openJiraKey(key) {
      const url = this.jiraUrlForKey(key);
      if (url == null) {
        this.$emit("alert", "No JIRA url configured", "error");
        return;
      }
      window.open(url, "jira_" + key, "noopener");
    },
    //routing config for the details panel. Fetched once, not on the poll: it is
    //large and changes about as often as someone edits alertmanager.yml.
    fetchRoutes() {
      axios
        .get(this.baseUrl + "routes", {headers: {"CORTANA-TOKEN": this.cortana_token}})
        .then(response => {
          const ams = response.data.payload.alertmanagers || [];
          this.routing.alertmanagers = ams;
          this.routing.index = buildReceiverIndex(ams);
          this.routing.loaded = true;
        })
        .catch(error => {
          //not fatal: the panel still lists the receivers, just not what they do
          console.log("Unable to load routing config: " + error);
        });
    },
    //what happened to this alert: the receivers alertmanager assigned it, each
    //resolved to what that receiver actually does
    detailsReceivers(item) {
      if (item == null) { return []; }
      return receiverNamesOf(item).map(
        name => lookupReceiver(this.routing.index, item.alertmanager, name));
    },
    //effective grouping and timings for the alert's alertmanager, from its root route
    detailsRouteDefaults(item) {
      if (item == null) { return null; }
      const am = this.routing.alertmanagers.find(a => a.name == item.alertmanager);
      return (am && am.route) ? am.route : null;
    },
    actionIcon(type) {
      return actionIcon(type);
    },
    //an empty group_by means one group for everything, not "ungrouped"
    groupByLabel(groupBy) {
      if (groupBy == null || groupBy.length == 0) { return 'all alerts together'; }
      if (groupBy.length == 1 && groupBy[0] == '...') { return 'every label'; }
      return groupBy.join(', ');
    },
    //an alert is a callin when its callin label reads true or 1; anything else,
    //including the label being absent, is not
    isCallin(item) {
      const v = item && item.alert && item.alert.labels ? item.alert.labels.callin : null;
      if (v == null) { return false; }
      const t = String(v).trim().toLowerCase();
      return t == "true" || t == "1";
    },
    //what jira last said about an alert's ticket. A key linked by hand carries no
    //status until the next refresh asks about it, and unknown reads as open
    jiraStatusOf(item) {
      return item == null ? "" : String(item.jiraStatus || '').toLowerCase();
    },
    //only an open ticket is live work worth the jira blue. One that is closed, or one
    //jira no longer has, is still worth opening but should not draw the eye
    isJiraLive(item) {
      const status = this.jiraStatusOf(item);
      return status != 'closed' && status != 'notfound';
    },
    jiraIconColor(item) {
      return this.isJiraLive(item) ? "#2684FF" : "#9CA3AF";
    },
    jiraIconTitle(item) {
      const key = (item && item.jiraKey) ? item.jiraKey : '';
      const status = this.jiraStatusOf(item);
      if (status == 'closed') { return "Open jira ticket " + key + " (closed)"; }
      if (status == 'notfound') { return "Jira has no ticket " + key; }
      return "Open jira ticket " + key;
    },
    //link to an alert's ticket, or null when there is no ticket or no jira configured
    jiraUrl(item) {
      if (item == null || !item.jiraKey || !this.jiraBaseUrl) { return null; }
      return this.jiraBaseUrl.replace(/\/+$/, '') + "/browse/" + item.jiraKey;
    },
    openJira(item) {
      const url = this.jiraUrl(item);
      if (url == null) {
        this.$emit("alert", "No JIRA url configured for this ticket", "error");
        return;
      }
      //jira refuses to be framed, so its own window is the only way to show it
      window.open(url, "jira_" + item.jiraKey, "noopener");
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
          environments: this.searchEnvironment,
          groupField: this.groupField,
          autoRefresh: this.autoRefresh,
          notCallin: this.notCallin,
          showLabels: this.showExtraLabels,
          grpExpMode: this.expandMode,
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
      // No grouping: always expand the single ALL group. Do NOT mutate
      // expandMode here, or the "first" setting leaks into grouped views.
      if (keys[0] == 'ALL') {
        this.panel = keys;
        this.setQueryString();
        return;
      }
      if (this.panel == "" || force) {
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
    fetchData(asExport, background) {
      this.expanded = []
      // Background (auto) refreshes keep the current rows on screen and just
      // swap the data in when it arrives, avoiding the loading-overlay flicker.
      if (!background) {
        this.loading = true;
      }
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


      if (this.searchEnvironment != null && this.searchEnvironment.length > 0) {
        urlString = urlString + delim + "environments=" + this.searchEnvironment;
        delim = "&";
      }

      if (this.groupField != null && this.groupField != "") {
        urlString = urlString + delim + "groupField=" + this.groupField;
        delim = "&";
      }

      //only ask the backend to narrow when NOT CALLIN is unticked
      if (!this.notCallin) {
        urlString = urlString + delim + "callinOnly=true";
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
            this.history = response.data.payload.history || [];
            //this.info.forEach(item => {
            //  this.expanded.push(item.id);
            //})
            this.logTypes = []
            this.payload.severities.forEach(value => {
              this.logTypes.push(value);
            })
            this.environments = []
            this.payload.instances.forEach(value => {
              this.environments.push(value);
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
