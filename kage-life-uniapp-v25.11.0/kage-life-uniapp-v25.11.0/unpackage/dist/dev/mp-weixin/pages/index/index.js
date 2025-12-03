"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const events = common_vendor.ref([]);
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
      fetchEvents();
      loadEventTypes();
    });
    const fetchEvents = (dateParam = currentDate.value) => {
      currentDate.value = dateParam;
      loading.value = true;
      errorMsg.value = "";
      common_vendor.index.request({
        url: "https://k4ge.bar/api/events/",
        method: "GET",
        data: { date: dateParam },
        success: (res) => {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.events)) {
            events.value = res.data.events.map((e) => ({
              id: e.id,
              time: e.start_time || "",
              title: e.title || "",
              raw: e
            }));
          } else {
            errorMsg.value = "接口返回异常";
            common_vendor.index.__f__("log", "at pages/index/index.vue:118", "接口异常", res);
          }
        },
        fail: (err) => {
          errorMsg.value = "网络请求失败";
          common_vendor.index.__f__("error", "at pages/index/index.vue:123", "请求失败", err);
        },
        complete: () => {
          loading.value = false;
        }
      });
    };
    const loadEventTypes = () => {
      common_vendor.index.request({
        url: "https://k4ge.bar/api/event_types/",
        method: "GET",
        success: (res) => {
          if (!res.data || !res.data.event_types) {
            common_vendor.index.showToast({ title: "类型列表数据格式不对", icon: "none" });
            return;
          }
          presetOptions.value = res.data.event_types.map((item) => item.description || item.type_name);
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/index/index.vue:143", "加载事件类型失败", err);
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
      fetchEvents(value);
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
                c: item.id
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
        n: common_vendor.o(onAdd)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
