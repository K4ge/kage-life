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
        const list = res.data.items || []
        // 前端按重要程度排序：3 > 2 > 1
        list.sort((a, b) => (b.priority || 0) - (a.priority || 0))
        items.value = list
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

const deadlineLabel = (item) => {
  const dateStr = item.deadline_date
  let label = ""
  if (dateStr === todayStr()) {
    label = "今天"
  } else if (dateStr === tomorrowStr()) {
    label = "明天"
  } else {
    label = dateStr || "未设置"
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
<<<<<<< ours
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 600;
  text-align: center;
  min-width: 96rpx;
=======
  padding: 12rpx 22rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  text-align: center;
  min-width: 140rpx;
>>>>>>> theirs
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
  background: #f6f7fb;
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
