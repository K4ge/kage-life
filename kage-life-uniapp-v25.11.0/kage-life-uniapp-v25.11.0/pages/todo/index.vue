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
import { onLoad } from "@dcloudio/uni-app"

const BASE_URL = "https://k4ge.bar/api"

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
const items = ref([])
const stats = ref({ total: 0, done: 0, todo: 0 })
const listLoading = ref(false)
const showAdd = ref(false)
const newTitle = ref("")
const newDate = ref(todayStr())
const newPriority = ref(2)

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
  fetchTodos("today")
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
        fetchTodos(activeTab.value)
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
