"use strict";
const common_vendor = require("../../common/vendor.js");
const BASE_URL = "https://k4ge.bar/api";
const EVENT_CACHE_PREFIX = "cached_events";
const TODO_CACHE_KEY = "cached_todos";
const CACHE_TTL_MS = 2 * 60 * 1e3;
const EVENT_TYPES_CACHE_KEY = "cached_event_types";
const EVENT_TYPES_TTL_MS = 24 * 60 * 60 * 1e3;
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const events = common_vendor.ref([]);
    const lastEventsTs = common_vendor.ref(0);
    const showEdit = common_vendor.ref(false);
    const editId = common_vendor.ref(null);
    const editTitle = common_vendor.ref("");
    const editStartTime = common_vendor.ref("");
    const editType = common_vendor.ref("");
    const editValueNumber = common_vendor.ref("");
    const loading = common_vendor.ref(false);
    const errorMsg = common_vendor.ref("");
    const showAddPanel = common_vendor.ref(false);
    const presetOptions = common_vendor.ref([]);
    const newTitle = common_vendor.ref("");
    const now = /* @__PURE__ */ new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const today = `${y}-${m}-${d}`;
    const currentDate = common_vendor.ref(today);
    common_vendor.onLoad(() => {
      loadEventsFromCache(currentDate.value);
      fetchEvents(currentDate.value);
      loadEventTypes();
      prefetchTodosAll({ force: true });
    });
    const cacheKeyForDate = (date) => `${EVENT_CACHE_PREFIX}_${date}`;
    const loadEventsFromCache = (dateParam) => {
      try {
        const cache = common_vendor.index.getStorageSync(cacheKeyForDate(dateParam));
        if (cache && Array.isArray(cache.items)) {
          events.value = cache.items;
          lastEventsTs.value = cache.ts || 0;
          loading.value = false;
          return true;
        }
      } catch (e) {
      }
      return false;
    };
    const saveEventsCache = (dateParam, items) => {
      try {
        common_vendor.index.setStorageSync(cacheKeyForDate(dateParam), { ts: Date.now(), items });
        lastEventsTs.value = Date.now();
      } catch (e) {
      }
    };
    const fetchEvents = (dateParam = currentDate.value, { force = false } = {}) => {
      currentDate.value = dateParam;
      errorMsg.value = "";
      const freshCache = loadEventsFromCache(dateParam);
      const cacheAgeOk = freshCache && Date.now() - lastEventsTs.value < CACHE_TTL_MS;
      if (cacheAgeOk && !force) {
        return;
      }
      loading.value = true;
      common_vendor.index.request({
        url: `${BASE_URL}/events/`,
        method: "GET",
        data: { date: dateParam },
        success: (res) => {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.events)) {
            const list = res.data.events.map((e) => ({
              id: e.id,
              time: e.start_time || "",
              title: e.title || "",
              raw: e
            }));
            events.value = list;
            saveEventsCache(dateParam, list);
          } else {
            errorMsg.value = "接口返回异常";
            common_vendor.index.__f__("log", "at pages/index/index.vue:207", "接口异常", res);
          }
        },
        fail: (err) => {
          errorMsg.value = "网络请求失败";
          common_vendor.index.__f__("error", "at pages/index/index.vue:212", "请求失败", err);
        },
        complete: () => {
          loading.value = false;
        }
      });
    };
    const loadEventTypes = () => {
      try {
        const cached = common_vendor.index.getStorageSync(EVENT_TYPES_CACHE_KEY);
        if (cached && cached.items && Date.now() - (cached.ts || 0) < EVENT_TYPES_TTL_MS) {
          presetOptions.value = cached.items;
          return;
        }
      } catch (e) {
      }
      common_vendor.index.request({
        url: `${BASE_URL}/event_types/`,
        method: "GET",
        success: (res) => {
          if (!res.data || !res.data.event_types) {
            common_vendor.index.showToast({ title: "类型列表数据格式不对", icon: "none" });
            return;
          }
          const list = res.data.event_types.map((item) => item.description || item.type_name);
          presetOptions.value = list;
          try {
            common_vendor.index.setStorageSync(EVENT_TYPES_CACHE_KEY, { ts: Date.now(), items: list });
          } catch (e) {
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/index/index.vue:244", "加载事件类型失败", err);
          common_vendor.index.showToast({ title: "加载事件类型失败", icon: "none" });
        }
      });
    };
    const toMinutes = (time) => {
      const [h, m2] = (time || "00:00").split(":").map(Number);
      return h * 60 + m2;
    };
    const sections = common_vendor.computed(() => {
      const morning = [];
      const noon = [];
      const afternoon = [];
      const night = [];
      const sorted = [...events.value].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      sorted.forEach((e) => {
        const minutes = toMinutes(e.time);
        if (minutes < 11 * 60 + 30) {
          morning.push(e);
        } else if (minutes >= 11 * 60 + 30 && minutes <= 13 * 60 + 30) {
          noon.push(e);
        } else if (minutes < 17 * 60 + 30) {
          afternoon.push(e);
        } else {
          night.push(e);
        }
      });
      return [
        { key: "morning", label: "上午", items: morning },
        { key: "noon", label: "中午", items: noon },
        { key: "afternoon", label: "下午", items: afternoon },
        { key: "night", label: "晚上", items: night }
      ];
    });
    const onAdd = () => {
      showAddPanel.value = true;
    };
    const buildNowTime = () => {
      const now2 = /* @__PURE__ */ new Date();
      const hh = String(now2.getHours()).padStart(2, "0");
      const mm = String(now2.getMinutes()).padStart(2, "0");
      const time = `${hh}:${mm}`;
      const y2 = now2.getFullYear();
      const m2 = String(now2.getMonth() + 1).padStart(2, "0");
      const d2 = String(now2.getDate()).padStart(2, "0");
      const date = `${y2}-${m2}-${d2}`;
      return { time, date };
    };
    const addEventToFront = (title, timeParam, dateParam) => {
      const { time, date } = timeParam && dateParam ? { time: timeParam, date: dateParam } : buildNowTime();
      const tempId = `temp-${Date.now()}`;
      events.value.push({
        id: tempId,
        time,
        title,
        date,
        raw: { pending: true }
      });
      return { tempId, time, date };
    };
    const requestCreateEvent = (title, tempId, startTime) => {
      common_vendor.index.request({
        url: "https://k4ge.bar/api/events/create/",
        method: "GET",
        data: { title, start_time: startTime },
        success: (res) => {
          if (res.statusCode === 201 && res.data && res.data.id) {
            const target = events.value.find((e) => e.id === tempId);
            if (target) {
              target.id = res.data.id;
              target.raw = res.data;
            }
            common_vendor.index.showToast({ title: "已保存", icon: "success" });
          } else {
            handleCreateFail(tempId, "保存失败");
          }
        },
        fail: () => {
          handleCreateFail(tempId, "网络错误");
        }
      });
    };
    const handleCreateFail = (tempId, message) => {
      events.value = events.value.filter((e) => e.id !== tempId);
      common_vendor.index.showToast({ title: message, icon: "none" });
    };
    const onQuickAdd = (index) => {
      const title = presetOptions.value[index];
      if (!title) {
        common_vendor.index.showToast({ title: "选项为空", icon: "none" });
        return;
      }
      const { tempId, time } = addEventToFront(title);
      showAddPanel.value = false;
      requestCreateEvent(title, tempId, time);
    };
    const onManualAdd = () => {
      const title = newTitle.value.trim();
      if (!title) {
        common_vendor.index.showToast({ title: "请输入标题", icon: "none" });
        return;
      }
      const { tempId, time } = addEventToFront(title);
      newTitle.value = "";
      showAddPanel.value = false;
      requestCreateEvent(title, tempId, time);
    };
    const onCancelAdd = () => {
      showAddPanel.value = false;
      newTitle.value = "";
    };
    const onDateChange = (e) => {
      var _a;
      const value = (_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value;
      if (!value)
        return;
      fetchEvents(value, { force: true });
    };
    const goTodo = () => {
      common_vendor.index.redirectTo({
        url: "/pages/todo/index"
      });
    };
    const openEdit = (item) => {
      var _a, _b;
      editId.value = item.id;
      editTitle.value = item.title || "";
      editStartTime.value = item.time || "";
      editType.value = ((_a = item.raw) == null ? void 0 : _a.event_type) || "";
      editValueNumber.value = ((_b = item.raw) == null ? void 0 : _b.value_number) ?? "";
      showEdit.value = true;
    };
    const closeEdit = () => {
      showEdit.value = false;
    };
    const saveEdit = () => {
      if (!editId.value)
        return;
      const payload = {};
      if (editTitle.value !== void 0)
        payload.title = editTitle.value;
      if (editStartTime.value !== void 0)
        payload.start_time = editStartTime.value;
      if (editType.value !== void 0)
        payload.event_type = editType.value;
      if (editValueNumber.value !== void 0)
        payload.value_number = editValueNumber.value;
      common_vendor.index.request({
        url: `${BASE_URL}/events/${editId.value}/update/`,
        method: "POST",
        data: payload,
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            events.value = events.value.map((e) => {
              if (e.id !== editId.value)
                return e;
              const t = res.data.start_time || e.time || "";
              return {
                ...e,
                time: t,
                title: res.data.title ?? e.title,
                raw: { ...e.raw || {}, ...res.data, start_time: t }
              };
            });
            saveEventsCache(currentDate.value, events.value);
            prefetchTodosAll({ force: true });
            closeEdit();
            common_vendor.index.showToast({ title: "已保存", icon: "success" });
          } else {
            common_vendor.index.showToast({ title: "保存失败", icon: "none" });
          }
        },
        fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" })
      });
    };
    const deleteEvent = () => {
      if (!editId.value)
        return;
      const delId = editId.value;
      common_vendor.index.showModal({
        title: "确认删除？",
        content: editTitle.value || "",
        success: (res) => {
          if (!res.confirm)
            return;
          common_vendor.index.request({
            url: `${BASE_URL}/events/${delId}/delete/`,
            method: "POST",
            success: (resp) => {
              if (resp.statusCode === 200 || resp.statusCode === 404) {
                events.value = events.value.filter((e) => e.id !== delId);
                saveEventsCache(currentDate.value, events.value);
                try {
                  const cachedTodo = common_vendor.index.getStorageSync(TODO_CACHE_KEY);
                  if (cachedTodo && Array.isArray(cachedTodo.items)) {
                    const updatedTodos = cachedTodo.items.map((t) => {
                      if (t.event_id === delId) {
                        return { ...t, is_done: 0, done_at: null, event_id: null };
                      }
                      return t;
                    });
                    common_vendor.index.setStorageSync(TODO_CACHE_KEY, { ts: Date.now(), items: updatedTodos });
                  }
                } catch (e) {
                }
                prefetchTodosAll({ force: true });
                closeEdit();
                common_vendor.index.showToast({ title: "已删除", icon: "success" });
              } else {
                common_vendor.index.showToast({ title: "删除失败", icon: "none" });
              }
            },
            fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" })
          });
        }
      });
    };
    const prefetchTodosAll = ({ force = false } = {}) => {
      try {
        const cached = common_vendor.index.getStorageSync(TODO_CACHE_KEY);
        if (!force && cached && cached.ts && Date.now() - cached.ts < CACHE_TTL_MS) {
          return;
        }
      } catch (e) {
      }
      common_vendor.index.request({
        url: `${BASE_URL}/todos/`,
        method: "GET",
        data: { tab: "all" },
        success: (res) => {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.items)) {
            common_vendor.index.setStorageSync(TODO_CACHE_KEY, { ts: Date.now(), items: res.data.items });
          }
        }
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(currentDate.value),
        b: currentDate.value,
        c: common_vendor.o(onDateChange),
        d: common_vendor.f(sections.value, (section, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(section.label),
            b: section.items.length
          }, section.items.length ? {
            c: common_vendor.f(section.items, (item, k1, i1) => {
              return {
                a: common_vendor.t(item.time),
                b: common_vendor.t(item.title),
                c: item.id,
                d: common_vendor.o(($event) => openEdit(item), item.id)
              };
            })
          } : {}, {
            d: section.key
          });
        }),
        e: showAddPanel.value
      }, showAddPanel.value ? {
        f: common_vendor.o(onManualAdd),
        g: newTitle.value,
        h: common_vendor.o(($event) => newTitle.value = $event.detail.value),
        i: common_vendor.o(onManualAdd),
        j: common_vendor.f(presetOptions.value, (item, index, i0) => {
          return {
            a: common_vendor.t(item),
            b: index,
            c: common_vendor.o(($event) => onQuickAdd(index), index)
          };
        }),
        k: common_vendor.o(onCancelAdd),
        l: common_vendor.o(() => {
        }),
        m: common_vendor.o(onCancelAdd)
      } : {}, {
        n: showEdit.value
      }, showEdit.value ? {
        o: editTitle.value,
        p: common_vendor.o(($event) => editTitle.value = $event.detail.value),
        q: editStartTime.value,
        r: common_vendor.o(($event) => editStartTime.value = $event.detail.value),
        s: editType.value,
        t: common_vendor.o(($event) => editType.value = $event.detail.value),
        v: editValueNumber.value,
        w: common_vendor.o(($event) => editValueNumber.value = $event.detail.value),
        x: common_vendor.o(closeEdit),
        y: common_vendor.o(deleteEvent),
        z: common_vendor.o(saveEdit),
        A: common_vendor.o(() => {
        }),
        B: common_vendor.o(closeEdit)
      } : {}, {
        C: common_vendor.o(onAdd),
        D: common_vendor.o(goTodo)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
