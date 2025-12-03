<template>
  <view class="page">
    <!-- 顶部日期 -->
    <view class="header">
      <picker mode="date" :value="currentDate" @change="onDateChange">
        <text class="header-title">{{ currentDate }}</text>
      </picker>
    </view>

    <!-- 区块：标题 + 时间轴 -->
    <view class="section" v-for="section in sections" :key="section.key">
      <view class="section-title">{{ section.label }}</view>

      <view class="timeline" v-if="section.items.length">
        <view class="timeline-line"></view>
        <view class="timeline-list">
          <view class="timeline-item" v-for="item in section.items" :key="item.id">
            <view class="dot"></view>
            <view class="item-content">
              <text class="item-time">{{ item.time }}</text>
              <text class="item-text">{{ item.title }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <text>暂无记录</text>
      </view>
    </view>

    <!-- 快速添加事项弹窗 -->
    <view v-if="showAddPanel" class="add-mask" @tap="onCancelAdd">
      <view class="add-dialog" @tap.stop>
        <view class="add-title">快速添加事项</view>

        <!-- 输入行：先把 title 放进前端，再异步请求后端 -->
        <view class="add-input-row">
          <input
            v-model="newTitle"
            placeholder="输入事件标题，先显示在页面"
            placeholder-style="color:#9b9b9b;font-size:24rpx;"
            confirm-type="done"
            @confirm="onManualAdd"
          />
          <button size="mini" type="primary" @tap="onManualAdd">添加</button>
        </view>
        <view class="add-tip">添加后会先插入列表，再调用后端保存</view>

        <!-- 快捷选项 -->
        <scroll-view scroll-y="true" style="max-height: 400rpx;">
          <view
            v-for="(item, index) in presetOptions"
            :key="index"
            class="add-option"
            @tap="onQuickAdd(index)"
          >
            <text>{{ item }}</text>
          </view>
        </scroll-view>

        <view class="add-actions">
          <button size="mini" @tap="onCancelAdd">关闭</button>
        </view>
      </view>
    </view>

    <!-- 右下角添加按钮 -->
    <view class="fab" @tap="onAdd">
      <text class="fab-plus">+</text>
    </view>

    <!-- 底部切换 -->
    <view class="bottom-nav">
      <view class="nav-item active">
        <text class="nav-label main">Event</text>
      </view>
      <view class="nav-item" @tap="goTodo">
        <text class="nav-label">Todo</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"

const events = ref([])

const loading = ref(false)
const errorMsg = ref('')
const showAddPanel = ref(false)
const presetOptions = ref([])
const newTitle = ref('')

const now = new Date()
const y = now.getFullYear()
const m = String(now.getMonth() + 1).padStart(2, '0')
const d = String(now.getDate()).padStart(2, '0')
const today = `${y}-${m}-${d}`
const currentDate = ref(today)

onLoad(() => {
  fetchEvents()
  loadEventTypes()
})

const fetchEvents = (dateParam = currentDate.value) => {
  currentDate.value = dateParam
  loading.value = true
  errorMsg.value = ''

  uni.request({
    url: 'https://k4ge.bar/api/events/',
    method: 'GET',
    data: { date: dateParam },
    success: (res) => {
      if (res.statusCode === 200 && res.data && Array.isArray(res.data.events)) {
        events.value = res.data.events.map(e => ({
          id: e.id,
          time: e.start_time || '',
          title: e.title || '',
          raw: e,
        }))
      } else {
        errorMsg.value = '接口返回异常'
        console.log('接口异常', res)
      }
    },
    fail: (err) => {
      errorMsg.value = '网络请求失败'
      console.error('请求失败', err)
    },
    complete: () => {
      loading.value = false
    }
  })
}

const loadEventTypes = () => {
  uni.request({
    url: 'https://k4ge.bar/api/event_types/',
    method: 'GET',
    success: (res) => {
      if (!res.data || !res.data.event_types) {
        uni.showToast({ title: '类型列表数据格式不对', icon: 'none' })
        return
      }
      presetOptions.value = res.data.event_types.map((item) => item.description || item.type_name)
    },
    fail: (err) => {
      console.error('加载事件类型失败', err)
      uni.showToast({ title: '加载事件类型失败', icon: 'none' })
    }
  })
}

const toMinutes = (time) => {
  const [h, m] = (time || '00:00').split(':').map(Number)
  return h * 60 + m
}

const sections = computed(() => {
  const morning = []
  const noon = []
  const afternoon = []
  const night = []

  const sorted = [...events.value].sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  sorted.forEach((e) => {
    const minutes = toMinutes(e.time)
    if (minutes < 11 * 60 + 30) {
      morning.push(e)
    } else if (minutes >= 11 * 60 + 30 && minutes <= 13 * 60 + 30) {
      noon.push(e)
    } else if (minutes < 17 * 60 + 30) {
      afternoon.push(e)
    } else {
      night.push(e)
    }
  })

  return [
    { key: 'morning', label: '上午', items: morning },
    { key: 'noon', label: '中午', items: noon },
    { key: 'afternoon', label: '下午', items: afternoon },
    { key: 'night', label: '晚上', items: night }
  ]
})

const onAdd = () => {
  showAddPanel.value = true
}

const buildNowTime = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const time = `${hh}:${mm}`

  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const date = `${y}-${m}-${d}`

  return { time, date }
}

const addEventToFront = (title, timeParam, dateParam) => {
  const { time, date } = timeParam && dateParam ? { time: timeParam, date: dateParam } : buildNowTime()
  const tempId = `temp-${Date.now()}`

  events.value.push({
    id: tempId,
    time,
    title,
    date,
    raw: { pending: true }
  })

  return { tempId, time, date }
}

const requestCreateEvent = (title, tempId, startTime) => {
  uni.request({
    url: 'https://k4ge.bar/api/events/create/',
    method: 'GET',
    data: { title, start_time: startTime },
    success: (res) => {
      if (res.statusCode === 201 && res.data && res.data.id) {
        const target = events.value.find(e => e.id === tempId)
        if (target) {
          target.id = res.data.id
          target.raw = res.data
        }
        uni.showToast({ title: '已保存', icon: 'success' })
      } else {
        handleCreateFail(tempId, '保存失败')
      }
    },
    fail: () => {
      handleCreateFail(tempId, '网络错误')
    }
  })
}

const handleCreateFail = (tempId, message) => {
  events.value = events.value.filter(e => e.id !== tempId)
  uni.showToast({ title: message, icon: 'none' })
}

const onQuickAdd = (index) => {
  const title = presetOptions.value[index]
  if (!title) {
    uni.showToast({ title: '选项为空', icon: 'none' })
    return
  }

  const { tempId, time } = addEventToFront(title)
  showAddPanel.value = false
  requestCreateEvent(title, tempId, time)
}

const onManualAdd = () => {
  const title = newTitle.value.trim()
  if (!title) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }

  const { tempId, time } = addEventToFront(title)
  newTitle.value = ''
  showAddPanel.value = false
  requestCreateEvent(title, tempId, time)
}

const onCancelAdd = () => {
  showAddPanel.value = false
  newTitle.value = ''
}

const onDateChange = (e) => {
  const value = e?.detail?.value
  if (!value) return
  fetchEvents(value)
}

const goTodo = () => {
  uni.redirectTo({
    url: '/pages/todo/index'
  })
}
</script>

<style scoped>
.page {
  padding: 24rpx;
  padding-bottom: 220rpx; /* 给底部导航+悬浮按钮留空间 */
}

.header {
  margin-bottom: 24rpx;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 500;
  margin-bottom: 12rpx;
}

.timeline {
  display: flex;
}

.timeline-line {
  width: 4rpx;
  background-color: #e5e5e5;
  margin-right: 24rpx;
  border-radius: 2rpx;
}

.timeline-list {
  flex: 1;
}

.timeline-item {
  position: relative;
  padding-bottom: 24rpx;
}

.dot {
  position: absolute;
  left: -34rpx;
  top: 4rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background-color: #409eff;
}

.item-content {
  display: flex;
  align-items: baseline;
}

.item-time {
  font-size: 26rpx;
  color: #999;
  width: 140rpx;
}

.item-text {
  font-size: 28rpx;
}

.empty {
  padding-left: 24rpx;
  color: #ccc;
  font-size: 24rpx;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 180rpx; /* 提高以避开底部导航 */
  width: 90rpx;
  height: 90rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #eef2ff, #e4e9ff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 26rpx rgba(0, 0, 0, 0.16);
  z-index: 950;
}

.fab-plus {
  color: #3d4ed1;
  font-size: 52rpx;
  line-height: 1;
}

.add-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(4rpx);
}

.add-dialog {
  width: 78%;
  max-width: 620rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 36rpx 32rpx 28rpx;
  box-shadow: 0 18rpx 40rpx rgba(0, 0, 0, 0.2);
}

.add-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.add-input-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  padding: 16rpx 14rpx;
  margin-bottom: 12rpx;
  border-radius: 14rpx;
  background-color: #f6f8fa;
}

.add-input-row input {
  flex: 1;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 18rpx 18rpx;
  height: 76rpx;
  line-height: 36rpx;
  font-size: 26rpx;
  box-sizing: border-box;
  min-width: 0;
}

.add-input-row button {
  flex-shrink: 0;
  height: 76rpx;
  line-height: 76rpx;
  padding: 0 26rpx;
}

.add-tip {
  font-size: 24rpx;
  color: #999;
  margin: 0 4rpx 18rpx;
}

.add-option {
  padding: 18rpx 12rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  background-color: #f7f7f7;
  font-size: 28rpx;
}

.add-option:active {
  background-color: #e6f0ff;
}

.add-actions {
  margin-top: 24rpx;
  display: flex;
  justify-content: flex-end;
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

.nav-label.main {
  font-size: 26rpx;
  letter-spacing: 0.4rpx;
}
</style>
