<template>
  <div class="gantt">
    <div class="gantt__head">
      <v-icon size="small" class="gantt__head-icon">mdi-chart-timeline</v-icon>
      <span class="gantt__title">Firing {{ formatStamp(start) }} &ndash; {{ formatStamp(end) }}</span>
      <span class="gantt__sub">{{ spanLabel }} &middot; {{ rows.length }} alert{{ rows.length == 1 ? '' : 's' }}</span>
      <v-spacer></v-spacer>
      <v-btn size="small" variant="tonal" color="purple" prepend-icon="mdi-close" @click="$emit('close')">
        Close
      </v-btn>
    </div>

    <div class="gantt__axis">
      <div class="gantt__axis-track">
        <span v-for="tick in ticks" :key="'t-' + tick.ms" class="gantt__axis-label" :style="{ left: tick.pct + '%' }">
          {{ tick.label }}
        </span>
      </div>
    </div>

    <div v-if="rows.length == 0" class="gantt__empty">
      No alerts were firing in the selected window.
    </div>

    <div v-else class="gantt__body">
      <div class="gantt__rows">
        <div class="gantt__grid">
          <span v-for="tick in ticks" :key="'g-' + tick.ms" class="gantt__gridline" :style="{ left: tick.pct + '%' }"></span>
        </div>
        <div v-for="row in rows" :key="row.id" class="gantt__row">
          <div class="gantt__label">
            <span class="gantt__dot" :style="{ background: severityColor(row.severity) }"></span>
            <span class="gantt__name" :title="row.alertname">{{ row.alertname }}</span>
            <span class="gantt__env" :title="row.instance">{{ row.environment || '—' }}</span>
          </div>
          <div class="gantt__track">
            <div
              class="gantt__bar"
              :class="{ 'gantt__bar--open-left': row.clippedLeft, 'gantt__bar--open-right': row.clippedRight }"
              :style="{ left: row.leftPct + '%', width: row.widthPct + '%', background: severityColor(row.severity) }"
              :title="barTitle(row)"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  const COLOR_CRITICAL = '#dc2626'
  const COLOR_WARNING = '#f59e0b'
  const COLOR_OTHER = '#94a3b8'

  // Candidate axis steps, in minutes, from a minute up to six hours.
  const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360]

  export default {
    name: 'AlertGantt',
    props: {
      // [{ id, alertname, environment, instance, severity, status, start, end }]
      // end == null means the alert is still firing.
      items: {
        type: Array,
        default: () => []
      },
      start: { type: Number, required: true },
      end: { type: Number, required: true },
    },
    emits: ['close'],
    computed: {
      span() {
        return Math.max(60000, this.end - this.start)
      },
      spanLabel() {
        const minutes = Math.round(this.span / 60000)
        if (minutes < 60) { return minutes + ' min' }
        const hours = Math.floor(minutes / 60)
        const rest = minutes % 60
        return hours + 'h' + (rest > 0 ? ' ' + rest + 'm' : '')
      },
      // Aim for roughly eight labelled ticks, snapped to a readable step and
      // aligned to the clock rather than to the selection's ragged edge.
      ticks() {
        const minutes = this.span / 60000
        let step = STEPS[STEPS.length - 1]
        for (let i = 0; i < STEPS.length; i++) {
          if (minutes / STEPS[i] <= 8) { step = STEPS[i]; break }
        }
        const stepMs = step * 60000
        const out = []
        for (let ms = Math.ceil(this.start / stepMs) * stepMs; ms <= this.end; ms += stepMs) {
          out.push({ ms: ms, pct: (ms - this.start) / this.span * 100, label: this.formatTime(ms) })
        }
        return out
      },
      rows() {
        const now = Date.now()
        return this.items.map(item => {
          const from = Math.max(item.start, this.start)
          const to = Math.min(item.end == null ? now : item.end, this.end)
          const leftPct = (from - this.start) / this.span * 100
          const widthPct = Math.max(0.4, (Math.max(to, from) - from) / this.span * 100)
          return Object.assign({}, item, {
            leftPct: leftPct,
            widthPct: Math.min(widthPct, 100 - leftPct),
            clippedLeft: item.start < this.start,
            clippedRight: (item.end == null ? now : item.end) > this.end,
          })
        })
      },
    },
    methods: {
      severityColor(severity) {
        const s = (severity == null ? '' : String(severity)).toLowerCase()
        if (s == 'critical' || s == 'crit' || s == 'fatal' || s == 'emergency' || s == 'page') {
          return COLOR_CRITICAL
        }
        if (s == 'warning' || s == 'warn' || s == 'major' || s == 'minor') {
          return COLOR_WARNING
        }
        return COLOR_OTHER
      },
      formatTime(ms) {
        const at = new Date(ms)
        return ('0' + at.getHours()).slice(-2) + ':' + ('0' + at.getMinutes()).slice(-2)
      },
      formatStamp(ms) {
        const at = new Date(ms)
        const today = new Date()
        const sameDay = at.toDateString() == today.toDateString()
        return (sameDay ? '' : (at.getMonth() + 1) + '/' + at.getDate() + ' ') + this.formatTime(ms)
      },
      barTitle(row) {
        let text = row.alertname
        if (row.instance) { text += ' @ ' + row.instance }
        text += '\n' + (row.severity || 'unknown') + ' · ' + row.status
        text += '\nfired ' + this.formatStamp(row.start)
        text += '\n' + (row.end == null ? 'still firing' : 'ended ' + this.formatStamp(row.end))
        if (row.summary) { text += '\n\n' + row.summary }
        return text
      },
    },
  }
</script>

<style scoped>
.gantt {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  margin-top: 4px;
  overflow: hidden;
}
.gantt__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #eef2ff;
  border-bottom: 1px solid #c7d2fe;
}
.gantt__head-icon {
  color: #4f46e5;
}
.gantt__title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}
.gantt__sub {
  font-size: 11px;
  color: #64748b;
}
/* The axis and every row share this label-column width so ticks, gridlines and
   bars all line up. */
.gantt__axis {
  display: flex;
  padding: 2px 10px 2px 0;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.gantt__axis-track {
  position: relative;
  flex: 1 1 auto;
  height: 14px;
  margin-left: 280px;
}
.gantt__axis-label {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 9px;
  line-height: 14px;
  color: #94a3b8;
  white-space: nowrap;
}
.gantt__body {
  /* Fill what is left under the app bars, but never collapse to nothing on a
     short viewport. */
  max-height: calc(100vh - 300px);
  min-height: 140px;
  overflow-y: auto;
}
.gantt__rows {
  position: relative;
}
.gantt__grid {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 280px;
  right: 10px;
  pointer-events: none;
}
.gantt__gridline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #f1f5f9;
}
.gantt__row {
  position: relative;
  display: flex;
  align-items: center;
  height: 22px;
  border-bottom: 1px solid #f8fafc;
}
.gantt__row:hover {
  background: #f8fafc;
}
.gantt__label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 280px;
  flex: 0 0 280px;
  padding-left: 8px;
  font-size: 11px;
  overflow: hidden;
}
.gantt__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: 0 0 7px;
}
.gantt__name {
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gantt__env {
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 0 auto;
  max-width: 96px;
}
.gantt__track {
  position: relative;
  flex: 1 1 auto;
  height: 100%;
  margin-right: 10px;
}
.gantt__bar {
  position: absolute;
  top: 6px;
  height: 10px;
  border-radius: 3px;
  min-width: 2px;
}
/* Square the edge where the alert runs past the selected window. */
.gantt__bar--open-left {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.55);
}
.gantt__bar--open-right {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  box-shadow: inset -3px 0 0 rgba(255, 255, 255, 0.55);
}
.gantt__bar--open-left.gantt__bar--open-right {
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.55), inset -3px 0 0 rgba(255, 255, 255, 0.55);
}
.gantt__empty {
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
}
</style>
