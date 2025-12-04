<template>
  <view class="todo-page">
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view class="stat-line">
      <text>{{ statText }}</text>
    </view>

    <view v-if="listLoading" class="empty">加载中...</view>
    <view v-else-if="!visibleTodos.length" class="empty">暂无待办</view>

    <view v-else class="card-list">
      <view
        v-for="item in visibleTodos"
        :key="item.id"
        class="todo-card"
        :class="cardClasses(item)"
      >
        <view class="left-bar"></view>
        <view class="card-content">
          <view class="card-header">
            <text class="card-title" :class="{ done: isDone(item) }">
              {{ item.title }}
            </text>
            <text class="card-time" v-if="deadlineLabel(item)">
              {{ deadlineLabel(item) }}
            </text>
          </view>

          <view class="card-meta">
            <text v-if="item.note" class="note">{{ item.note }}</text>
          </view>

          <view class="card-actions">
            <view
              class="btn primary"
              v-if="!isDone(item)"
              @tap="markDone(item)"
            >
              完成
            </view>
            <view
              class="btn ghost"
              v-else
              @tap="undoDone(item)"
            >
              撤销完成
            </view>
            <view class="btn danger" @tap="removeTodo(item)">
              删除
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item" @tap="goTimeline">
        <text class="nav-label">Event</text>
      </view>
      <view class="nav-item active">
        <text class="nav-label main">Todo</text>
      </view>
    </view>

    <!-- 右下角添加按钮 -->
    <view class="fab" @tap="openAdd">
      <text class="fab-plus">+</text>
    </view>

    <!-- 添加弹窗 -->
    <view v-if="showAdd" class="add-mask" @tap="closeAdd">
      <view class="add-panel" @tap.stop>
        <view class="add-title">新建待办</view>

        <view class="add-field">
          <text class="add-label">标题</text>
          <input class="add-input" v-model="newTitle" placeholder="请输入标题" />
        </view>

        <view class="add-field">
          <text class="add-label">日期</text>
          <picker mode="date" :value="newDate" @change="(e)=>{newDate = e.detail.value}">
            <view class="add-input">{{ newDate }}</view>
          </picker>
        </view>

        <view class="add-field">
          <text class="add-label">重要程度</text>
          <view class="priority-row">
            <view
              class="pri-btn"
              :class="{ active: newPriority === 3 }"
              @tap="pickPriority(3)"
            >重要</view>
            <view
              class="pri-btn"
              :class="{ active: newPriority === 2 }"
              @tap="pickPriority(2)"
            >普通</view>
            <view
              class="pri-btn"
              :class="{ active: newPriority === 1 }"
              @tap="pickPriority(1)"
            >不急</view>
          </view>
        </view>

        <view class="add-actions">
          <view class="add-btn" @tap="closeAdd">取消</view>
          <view class="add-btn primary" @tap="createTodo">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue"
import { onLoad, onShow } from "@dcloudio/uni-app"

const BASE_URL = "https://k4ge.bar/api"
const TODO_CACHE_KEY = "cached_todos"
const CACHE_TTL_MS = 2 * 60 * 1000
const EVENT_CACHE_PREFIX = "cached_events"
const EVENT_CACHE_TTL_MS = 2 * 60 * 1000
const hasLoadedOnce = ref(false)

const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const tomorrowStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const tabs = [
  { key: "today", label: "今天到期" },
  { key: "all", label: "全部" },
  { key: "important", label: "仅重要" },
  { key: "done", label: "已完成" }
]

const activeTab = ref("today")
const allTodos = ref([])
const listLoading = ref(true)
const showAdd = ref(false)
const newTitle = ref("")
const newDate = ref(todayStr())
const newPriority = ref(2)

const sortTodos = (list) => {
  return [...list].sort((a, b) => {
    const ad = a.deadline_date || ""
    const bd = b.deadline_date || ""
    const at = a.deadline_time || ""
    const bt = b.deadline_time || ""
    if ((a.is_done || 0) !== (b.is_done || 0)) return (a.is_done || 0) - (b.is_done || 0)
    const cmpDate = ad.localeCompare(bd)
    if (cmpDate !== 0) return cmpDate
    const cmpTime = at.localeCompare(bt)
    if (cmpTime !== 0) return cmpTime
    const cmpPri = (b.priority || 0) - (a.priority || 0)
    if (cmpPri !== 0) return cmpPri
    return (a.id || 0) - (b.id || 0)
  })
}

const filterByTab = (tab, list) => {
  const today = todayStr()
  const toMs = (d) => {
    if (!d) return null
    const [y, m, day] = d.split("-").map(Number)
    return new Date(y, m - 1, day).getTime()
  }
  const todayMs = toMs(today)

  if (tab === "today") {
    return list.filter((i) => {
      const ms = toMs(i.deadline_date)
      if (ms === null) return false
      if (Number(i.is_done) === 1) {
        return ms === todayMs // 已完成只看今天
      }
      return ms <= todayMs    // 未完成包含今天及逾期
    })
  }
  if (tab === "important") return list.filter((i) => Number(i.priority) === 3)
  if (tab === "done") return list.filter((i) => Number(i.is_done) === 1)
  return list
}

const visibleTodos = computed(() => {
  const filtered = filterByTab(activeTab.value, allTodos.value || [])
  return sortTodos(filtered)
})

const statInfo = computed(() => {
  const list = visibleTodos.value
  const done = list.filter((i) => Number(i.is_done) === 1).length
  return {
    total: list.length,
    done,
    todo: list.length - done
  }
})

const statText = computed(() => {
  const stats = statInfo.value
  if (activeTab.value === "done") {
    return `当前已完成 ${stats.done} 项`
  }
  const prefix =
    activeTab.value === "today"
      ? "今日待办"
      : activeTab.value === "important"
        ? "重要待办"
        : "全部待办"
  return `${prefix} ${stats.todo} 项 · 已完成 ${stats.done} 项`
})

const normalizeTodo = (t) => ({
  ...t,
  is_done: Number(t.is_done) || 0,
  priority: Number(t.priority) || 0,
})

const setTodos = (list) => {
  allTodos.value = sortTodos((list || []).map(normalizeTodo))
  try {
    uni.setStorageSync(TODO_CACHE_KEY, { ts: Date.now(), items: allTodos.value })
  } catch (e) {}
}

const applyLocalStatus = (todoId, isDoneFlag) => {
  const nowStr = (() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const mm = String(d.getMinutes()).padStart(2, "0")
    return `${y}-${m}-${day} ${hh}:${mm}`
  })()
  const updated = allTodos.value.map((i) => {
    if (i.id !== todoId) return i
    return normalizeTodo({
      ...i,
      is_done: isDoneFlag ? 1 : 0,
      done_at: isDoneFlag ? nowStr : null
    })
  })
  setTodos(updated)
}

const fetchTodosAll = ({ force = false } = {}) => {
  if (hasLoadedOnce.value && !force) return
  hasLoadedOnce.value = true
  listLoading.value = true
  uni.request({
    url: `${BASE_URL}/todos/`,
    method: "GET",
    data: { tab: "all" },
    success: (res) => {
      if (res.statusCode === 200 && res.data) {
        setTodos(res.data.items || [])
      } else {
        uni.showToast({ title: "加载失败", icon: "none" })
      }
    },
    fail: () => uni.showToast({ title: "网络异常", icon: "none" }),
    complete: () => {
      listLoading.value = false
    }
  })
}

onLoad(() => {
  // 优先展示缓存
  try {
    const cached = uni.getStorageSync(TODO_CACHE_KEY)
    if (cached && Array.isArray(cached.items)) {
      setTodos(cached.items)
      listLoading.value = false
      if (cached.ts && Date.now() - cached.ts < CACHE_TTL_MS) {
        hasLoadedOnce.value = true
        return
      }
    }
  } catch (e) {}
  // 缓存新鲜则不强制请求；需要更新时由 fetchTodosAll 内部决定
  fetchTodosAll()
  prefetchEventsForToday()
})

onShow(() => {
  // 每次进入待办页面时，刷新当日事件缓存，不阻塞待办展示
  prefetchEventsForToday(true)
})

const switchTab = (tab) => {
  activeTab.value = tab
}

const deadlineLabel = (item) => {
  const dateStr = item.deadline_date
  if (!dateStr) return "未设置"
  const toMs = (d) => {
    const [y, m, day] = d.split("-").map(Number)
    return new Date(y, m - 1, day).getTime()
  }
  const today = todayStr()
  const todayMs = toMs(today)
  const ms = toMs(dateStr)
  let label = ""
  if (isDone(item)) {
    if (ms === todayMs) label = "今天"
    else label = dateStr
  } else {
    if (ms === todayMs) {
      label = "今天"
    } else if (ms < todayMs) {
      const diffDays = Math.max(1, Math.round((todayMs - ms) / 86400000))
      label = `逾期${diffDays}天`
    } else {
      label = dateStr
    }
  }
  return label
}

const markDone = (item) => {
  const eventDate = todayStr() // 事件缓存按当前日期刷新
  applyLocalStatus(item.id, 1)
  uni.request({
    url: `${BASE_URL}/todos/${item.id}/status/`,
    method: "POST",
    data: { is_done: 1 },
    success: (res) => {
      if (res.statusCode === 200 && res.data?.item) {
        const updated = normalizeTodo({ ...res.data.item, is_done: 1 })
        const list = allTodos.value.map((i) => i.id === updated.id ? updated : i)
        setTodos(list)
        // 操作后直接刷新对应日期的事件缓存，确保事件页同步
        refreshEventCache(eventDate)
      } else {
        uni.showToast({ title: "操作失败", icon: "none" })
      }
    },
    fail: () => uni.showToast({ title: "网络异常", icon: "none" })
  })
}

const undoDone = (item) => {
  const eventDate = todayStr()
  applyLocalStatus(item.id, 0)

  uni.request({
    url: `${BASE_URL}/todos/${item.id}/status/`,
    method: "POST",
    data: { is_done: 0 },
    success: (res) => {
      if (res.statusCode === 200 && res.data?.item) {
        const updated = normalizeTodo({ ...res.data.item, is_done: 0 })
        const list = allTodos.value.map((i) => i.id === updated.id ? updated : i)
        setTodos(list)
        refreshEventCache(eventDate)
      } else {
        uni.showToast({ title: "操作失败", icon: "none" })
      }
    },
    fail: () => uni.showToast({ title: "网络异常", icon: "none" })
  })
}

const removeTodo = (item) => {
  uni.showModal({
    title: "确认删除？",
    content: item.title,
    success: (res) => {
      if (!res.confirm) return
      uni.request({
        url: `${BASE_URL}/todos/${item.id}/delete/`,
        method: "POST",
        success: (resp) => {
          if (resp.statusCode === 200) {
            const list = allTodos.value.filter((t) => t.id !== item.id)
            setTodos(list)
            refreshEventCache(todayStr())
          } else {
            uni.showToast({ title: "删除失败", icon: "none" })
          }
        },
        fail: () => uni.showToast({ title: "网络异常", icon: "none" })
      })
    }
  })
}

// 状态判断，避免字符串 "0"/"1" 导致样式异常
const isDone = (todo) => Number(todo?.is_done) === 1
const cardClasses = (item) => {
  const done = isDone(item)
  return ['priority-' + item.priority, done ? 'is-done' : 'not-done']
}

const goTimeline = () => {
  uni.redirectTo({
    url: "/pages/index/index"
  })
}

// ------- 事件缓存同步，保持与待办联动 -------
const eventCacheKey = (date) => `${EVENT_CACHE_PREFIX}_${date || todayStr()}`

const refreshEventCache = (dateParam) => {
  const date = dateParam || todayStr()
  uni.request({
    url: `${BASE_URL}/events/`,
    method: "GET",
    data: { date },
    success: (res) => {
      if (res.statusCode === 200 && res.data && Array.isArray(res.data.events)) {
        const list = res.data.events.map(e => ({
          id: e.id,
          time: e.start_time || "",
          title: e.title || "",
          raw: e,
        }))
        uni.setStorageSync(eventCacheKey(date), { ts: Date.now(), items: list })
      }
    },
  })
}

// 进入待办页时预取当日事件，保持事件页缓存新鲜
const prefetchEventsForToday = (force = false) => {
  const date = todayStr()
  try {
    const cache = uni.getStorageSync(eventCacheKey(date))
    if (!force && cache && cache.ts && Date.now() - cache.ts < EVENT_CACHE_TTL_MS) return
  } catch (e) {}

  uni.request({
    url: `${BASE_URL}/events/`,
    method: "GET",
    data: { date },
    success: (res) => {
      if (res.statusCode === 200 && res.data && Array.isArray(res.data.events)) {
        const list = res.data.events.map(e => ({
          id: e.id,
          time: e.start_time || "",
          title: e.title || "",
          raw: e,
        }))
        uni.setStorageSync(eventCacheKey(date), { ts: Date.now(), items: list })
      }
    },
  })
}

const openAdd = () => {
  newTitle.value = ""
  newDate.value = todayStr()
  newPriority.value = 2
  showAdd.value = true
}

const closeAdd = () => {
  showAdd.value = false
}

const pickPriority = (val) => {
  newPriority.value = val
}

const createTodo = () => {
  const title = newTitle.value.trim()
  if (!title) {
    uni.showToast({ title: "请输入标题", icon: "none" })
    return
  }
  uni.request({
    url: `${BASE_URL}/todos/create/`,
    method: "POST",
    data: {
      title,
      deadline_date: newDate.value,
      priority: newPriority.value
    },
    success: (res) => {
      if (res.statusCode === 201) {
        closeAdd()
        const newItem = res.data?.item
        if (newItem) {
          const list = [...allTodos.value, newItem]
          setTodos(list)
        } else {
          fetchTodosAll()
        }
        uni.showToast({ title: "已添加", icon: "success" })
      } else {
        uni.showToast({ title: "添加失败", icon: "none" })
      }
    },
    fail: () => uni.showToast({ title: "网络异常", icon: "none" })
  })
}
</script>

<style scoped>
.todo-page {
  min-height: 100vh;
  background: #f5f6fb;
  padding: 10rpx 28rpx 200rpx;
  box-sizing: border-box;
}

.tabs {
  display: flex;
  gap: 18rpx;
  margin: 12rpx 0 12rpx;
  flex-wrap: wrap;
}

.tab-item {
  padding: 16rpx 26rpx;
  border-radius: 999rpx;
  background: #f0f1f5;
  color: #4e5364;
  font-size: 26rpx;
}

.tab-item.active {
  background: #e2e6f5;
  color: #1f2d4a;
  font-weight: 600;
}

.stat-line {
  color: #7c8090;
  font-size: 24rpx;
  margin-bottom: 20rpx;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.todo-card {
  position: relative;
  background: #ffffff;
  border-radius: 22rpx;
  padding: 22rpx 20rpx 18rpx 24rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.02);
}

.todo-card .left-bar {
  position: absolute;
  left: 0;
  top: 18rpx;
  bottom: 18rpx;
  width: 8rpx;
  border-radius: 10rpx;
}

.priority-3 .left-bar {
  background: linear-gradient(180deg, #ffd7db, #ffb4bc);
}

.priority-2 .left-bar {
  background: linear-gradient(180deg, #ffe9c8, #ffd9a1);
}

.priority-1 .left-bar {
  background: linear-gradient(180deg, #d7f1e2, #b8e2c9);
}

.card-content {
  margin-left: 20rpx;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 4rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2430;
  flex: 1;
}

.card-time {
  font-size: 22rpx;
  color: #586075;
}

.card-title.done {
  color: #93a0b4;
  text-decoration: line-through;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  color: #667080;
  font-size: 24rpx;
  margin-bottom: 10rpx;
}

.deadline {
  font-weight: 600;
}

.note {
  color: #8a92a3;
}

.card-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 6rpx;
}

.btn {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 600;
  text-align: center;
  min-width: 96rpx;
}

.btn.primary {
  background: #eef2ff;
  color: #3a4cce;
}

.btn.ghost {
  background: #f5f6fa;
  color: #2f3542;
}

.btn.danger {
  background: #ffffff;
  color: #d65a5a;
  border: 2rpx solid #f7dada;
}

.todo-card.is-done {
  background: #f2f4f8;
}
.todo-card.not-done {
  background: #ffffff;
}
.todo-card.is-done .card-title {
  color: #93a0b4;
  text-decoration: line-through;
}
.todo-card.not-done .card-title {
  color: #1f2430;
  text-decoration: none;
}
.todo-card.is-done .card-actions .btn.primary {
  background: #e6e9f2;
  color: #6f7a91;
}
.todo-card.not-done .card-actions .btn.primary {
  background: #eef2ff;
  color: #3a4cce;
}

.empty {
  text-align: center;
  color: #96a0b1;
  padding: 40rpx 0;
  font-size: 26rpx;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: 16rpx;
  z-index: 900;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #7a7f8c;
  font-size: 24rpx;
  padding: 10rpx 0;
}

.nav-item.active {
  color: #1f2d4a;
  font-weight: 700;
}

.nav-label {
  font-size: 24rpx;
}

.nav-label.main {
  font-size: 26rpx;
  letter-spacing: 0.4rpx;
}

.fab {
  position: fixed;
  right: 34rpx;
  bottom: 180rpx;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #eef2ff, #e4e9ff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 24rpx rgba(0, 0, 0, 0.14);
  z-index: 950;
}

.fab-plus {
  color: #3d4ed1;
  font-size: 48rpx;
  line-height: 1;
}

.add-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.add-panel {
  width: 84%;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 26rpx 24rpx;
  box-shadow: 0 18rpx 40rpx rgba(0, 0, 0, 0.18);
}

.add-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 18rpx;
  color: #1f2430;
}

.add-field {
  margin-bottom: 18rpx;
}

.add-label {
  font-size: 24rpx;
  color: #60697b;
  margin-bottom: 8rpx;
  display: block;
}

.add-input {
  width: 100%;
  border: 1rpx solid #e5e7ef;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
  height: 72rpx;
  line-height: 44rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.priority-row {
  display: flex;
  gap: 12rpx;
}

.pri-btn {
  flex: 1;
  border: 1rpx solid #e5e7ef;
  border-radius: 12rpx;
  padding: 14rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #4c5260;
}

.pri-btn.active {
  background: #eef2ff;
  color: #3d4ed1;
  border-color: #d9defc;
}

.add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  margin-top: 10rpx;
}

.add-btn {
  padding: 12rpx 22rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  border: 1rpx solid #e5e7ef;
}

.add-btn.primary {
  background: #f4f6ff;
  color: #3d4ed1;
  border-color: #d9defc;
}
</style>
