<template>
  <view class="todo-page">
    <view class="top">
      <view>
        <view class="title">待办清单</view>
        <view class="sub">今天：保持专注，做完就勾掉</view>
      </view>
      <view class="sync-tag">与 Timeline+ 对应</view>
    </view>

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
    <view v-else-if="!items.length" class="empty">暂无待办</view>

    <view v-else class="card-list">
      <view
        v-for="item in items"
        :key="item.id"
        class="todo-card"
        :class="['priority-' + item.priority, { 'is-done': item.is_done }]"
      >
        <view class="left-bar"></view>
        <view class="card-content">
          <view class="card-header">
            <text class="card-title" :class="{ done: item.is_done }">
              {{ item.title }}
            </text>
            <view
              class="tag"
              :class="item.is_done ? 'tag-done' : tagClass(item.priority)"
            >
              {{ item.is_done ? '已完成' : tagLabel(item.priority) }}
            </view>
          </view>

          <view class="card-meta">
            <text class="deadline">截止：{{ deadlineLabel(item) }}</text>
            <text v-if="item.note" class="note">{{ item.note }}</text>
          </view>

          <view class="card-actions">
            <view
              class="btn primary"
              v-if="!item.is_done"
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
        <view class="nav-icon muted">📅</view>
        <text class="nav-label">时间线</text>
      </view>
      <view class="nav-item active">
        <view class="nav-icon">✅</view>
        <text class="nav-label">待办</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"

const BASE_URL = "http://127.0.0.1:8000/api"

const tabs = [
  { key: "all", label: "全部" },
  { key: "today", label: "今天到期" },
  { key: "important", label: "仅重要" },
  { key: "done", label: "已完成" }
]

const activeTab = ref("all")
const items = ref([])
const stats = ref({ total: 0, done: 0, todo: 0 })
const listLoading = ref(false)

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

const statText = computed(() => {
  if (activeTab.value === "done") {
    return `今日已完成 ${stats.value.done} 项`
  }
  const prefix =
    activeTab.value === "today"
      ? "今日待办"
      : activeTab.value === "important"
        ? "重要待办"
        : "全部待办"
  return `${prefix} ${stats.value.todo} 项 · 已完成 ${stats.value.done} 项`
})

onLoad(() => {
  fetchTodos()
})

const fetchTodos = (tab = activeTab.value) => {
  activeTab.value = tab
  listLoading.value = true
  uni.request({
    url: `${BASE_URL}/todos/`,
    method: "GET",
    data: { tab },
    success: (res) => {
      if (res.statusCode === 200 && res.data) {
        items.value = res.data.items || []
        stats.value = res.data.stats || { total: 0, done: 0, todo: 0 }
      } else {
        uni.showToast({ title: "加载失败", icon: "none" })
      }
    },
    fail: () => {
      uni.showToast({ title: "网络异常", icon: "none" })
    },
    complete: () => {
      listLoading.value = false
    }
  })
}

const switchTab = (tab) => {
  if (tab === activeTab.value) return
  fetchTodos(tab)
}

const tagLabel = (priority) => {
  if (priority === 3) return "重要"
  if (priority === 1) return "不急"
  return "普通"
}

const tagClass = (priority) => {
  if (priority === 3) return "tag-red"
  if (priority === 1) return "tag-green"
  return "tag-yellow"
}

const deadlineLabel = (item) => {
  const dateStr = item.deadline_date
  const timeStr = item.deadline_time
  let label = ""
  if (dateStr === todayStr()) {
    label = "今天"
  } else if (dateStr === tomorrowStr()) {
    label = "明天"
  } else {
    label = dateStr || "未设置"
  }
  if (timeStr) {
    return `${label} ${timeStr}`
  }
  return label
}

const markDone = (item) => {
  uni.request({
    url: `${BASE_URL}/todos/${item.id}/status/`,
    method: "POST",
    data: { is_done: 1 },
    success: (res) => {
      if (res.statusCode === 200 && res.data?.item) {
        fetchTodos(activeTab.value)
      } else {
        uni.showToast({ title: "操作失败", icon: "none" })
      }
    },
    fail: () => uni.showToast({ title: "网络异常", icon: "none" })
  })
}

const undoDone = (item) => {
  uni.request({
    url: `${BASE_URL}/todos/${item.id}/status/`,
    method: "POST",
    data: { is_done: 0 },
    success: (res) => {
      if (res.statusCode === 200 && res.data?.item) {
        fetchTodos(activeTab.value)
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
            fetchTodos(activeTab.value)
          } else {
            uni.showToast({ title: "删除失败", icon: "none" })
          }
        },
        fail: () => uni.showToast({ title: "网络异常", icon: "none" })
      })
    }
  })
}

const goTimeline = () => {
  uni.redirectTo({
    url: "/pages/index/index"
  })
}
</script>

<style scoped>
.todo-page {
  min-height: 100vh;
  background: #f5f6fb;
  padding: 28rpx 28rpx 200rpx;
  box-sizing: border-box;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1e1f24;
}

.sub {
  margin-top: 6rpx;
  color: #6b7080;
  font-size: 26rpx;
}

.sync-tag {
  padding: 12rpx 20rpx;
  background: #f0f4ff;
  color: #3a64ff;
  border-radius: 28rpx;
  font-size: 24rpx;
}

.tabs {
  display: flex;
  gap: 18rpx;
  margin: 24rpx 0 12rpx;
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
  background: linear-gradient(135deg, #1e2b5f, #2a3d7b);
  color: #ffffff;
  font-weight: 600;
}

.stat-line {
  color: #6b7080;
  font-size: 26rpx;
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
  padding: 26rpx 22rpx 20rpx 26rpx;
  box-shadow: 0 12rpx 30rpx rgba(0, 0, 0, 0.04);
}

.todo-card .left-bar {
  position: absolute;
  left: 0;
  top: 18rpx;
  bottom: 18rpx;
  width: 10rpx;
  border-radius: 10rpx;
}

.priority-3 .left-bar {
  background: linear-gradient(180deg, #ff6b6b, #ff3b30);
}

.priority-2 .left-bar {
  background: linear-gradient(180deg, #f7b733, #f57c00);
}

.priority-1 .left-bar {
  background: linear-gradient(180deg, #7ed957, #33b249);
}

.card-content {
  margin-left: 20rpx;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 10rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1d1f24;
  flex: 1;
}

.card-title.done {
  color: #93a0b4;
  text-decoration: line-through;
}

.tag {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #ffffff;
}

.tag-red {
  background: linear-gradient(135deg, #ff6b6b, #ff3b30);
}

.tag-yellow {
  background: linear-gradient(135deg, #f7b733, #f57c00);
}

.tag-green {
  background: linear-gradient(135deg, #70d16b, #3ab54a);
}

.tag-done {
  background: #e1e6ef;
  color: #4c5a6e;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  color: #5d6577;
  font-size: 26rpx;
  margin-bottom: 14rpx;
}

.deadline {
  font-weight: 600;
}

.note {
  color: #8892a7;
}

.card-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 6rpx;
}

.btn {
  padding: 14rpx 26rpx;
  border-radius: 14rpx;
  font-size: 26rpx;
  font-weight: 600;
  text-align: center;
  min-width: 140rpx;
}

.btn.primary {
  background: #0f1f4b;
  color: #ffffff;
}

.btn.ghost {
  background: #eef1f7;
  color: #1f2a3d;
}

.btn.danger {
  background: #ffffff;
  color: #d83c3c;
  border: 2rpx solid #f1c7c7;
}

.todo-card.is-done {
  background: #f4f6fa;
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
  height: 140rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: 20rpx;
  z-index: 900;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  color: #8a8a8a;
  font-size: 24rpx;
}

.nav-item.active {
  color: #222222;
  font-weight: 700;
}

.nav-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, #daf1df, #b5e5c7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}

.nav-icon.muted {
  background: linear-gradient(135deg, #e5e9ff, #d1d9ff);
}

.nav-label {
  font-size: 24rpx;
}
</style>
