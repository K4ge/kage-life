"use strict";
const common_vendor = require("../../common/vendor.js");
const BASE_URL = "http://127.0.0.1:8000/api";
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const tabs = [
      { key: "today", label: "今天到期" },
      { key: "all", label: "全部" },
      { key: "important", label: "仅重要" },
      { key: "done", label: "已完成" }
    ];
    const activeTab = common_vendor.ref("today");
    const items = common_vendor.ref([]);
    const stats = common_vendor.ref({ total: 0, done: 0, todo: 0 });
    const listLoading = common_vendor.ref(false);
    const todayStr = () => {
      const d = /* @__PURE__ */ new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const tomorrowStr = () => {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const statText = common_vendor.computed(() => {
      if (activeTab.value === "done") {
        return `今日已完成 ${stats.value.done} 项`;
      }
      const prefix = activeTab.value === "today" ? "今日待办" : activeTab.value === "important" ? "重要待办" : "全部待办";
      return `${prefix} ${stats.value.todo} 项 · 已完成 ${stats.value.done} 项`;
    });
    common_vendor.onLoad(() => {
      fetchTodos("today");
    });
    const fetchTodos = (tab = activeTab.value) => {
      activeTab.value = tab;
      listLoading.value = true;
      common_vendor.index.request({
        url: `${BASE_URL}/todos/`,
        method: "GET",
        data: { tab },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const list = res.data.items || [];
            list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            items.value = list;
            stats.value = res.data.stats || { total: 0, done: 0, todo: 0 };
          } else {
            common_vendor.index.showToast({ title: "加载失败", icon: "none" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ title: "网络异常", icon: "none" });
        },
        complete: () => {
          listLoading.value = false;
        }
      });
    };
    const switchTab = (tab) => {
      if (tab === activeTab.value)
        return;
      fetchTodos(tab);
    };
    const deadlineLabel = (item) => {
      const dateStr = item.deadline_date;
      let label = "";
      if (dateStr === todayStr()) {
        label = "今天";
      } else if (dateStr === tomorrowStr()) {
        label = "明天";
      } else {
        label = dateStr || "未设置";
      }
      return label;
    };
    const markDone = (item) => {
      common_vendor.index.request({
        url: `${BASE_URL}/todos/${item.id}/status/`,
        method: "POST",
        data: { is_done: 1 },
        success: (res) => {
          var _a;
          if (res.statusCode === 200 && ((_a = res.data) == null ? void 0 : _a.item)) {
            fetchTodos(activeTab.value);
          } else {
            common_vendor.index.showToast({ title: "操作失败", icon: "none" });
          }
        },
        fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" })
      });
    };
    const undoDone = (item) => {
      common_vendor.index.request({
        url: `${BASE_URL}/todos/${item.id}/status/`,
        method: "POST",
        data: { is_done: 0 },
        success: (res) => {
          var _a;
          if (res.statusCode === 200 && ((_a = res.data) == null ? void 0 : _a.item)) {
            fetchTodos(activeTab.value);
          } else {
            common_vendor.index.showToast({ title: "操作失败", icon: "none" });
          }
        },
        fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" })
      });
    };
    const removeTodo = (item) => {
      common_vendor.index.showModal({
        title: "确认删除？",
        content: item.title,
        success: (res) => {
          if (!res.confirm)
            return;
          common_vendor.index.request({
            url: `${BASE_URL}/todos/${item.id}/delete/`,
            method: "POST",
            success: (resp) => {
              if (resp.statusCode === 200) {
                fetchTodos(activeTab.value);
              } else {
                common_vendor.index.showToast({ title: "删除失败", icon: "none" });
              }
            },
            fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" })
          });
        }
      });
    };
    const goTimeline = () => {
      common_vendor.index.redirectTo({
        url: "/pages/index/index"
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.f(tabs, (tab, k0, i0) => {
          return {
            a: common_vendor.t(tab.label),
            b: tab.key,
            c: activeTab.value === tab.key ? 1 : "",
            d: common_vendor.o(($event) => switchTab(tab.key), tab.key)
          };
        }),
        b: common_vendor.t(statText.value),
        c: listLoading.value
      }, listLoading.value ? {} : !items.value.length ? {} : {
        e: common_vendor.f(items.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.title),
            b: item.is_done ? 1 : "",
            c: deadlineLabel(item)
          }, deadlineLabel(item) ? {
            d: common_vendor.t(deadlineLabel(item))
          } : {}, {
            e: item.note
          }, item.note ? {
            f: common_vendor.t(item.note)
          } : {}, {
            g: !item.is_done
          }, !item.is_done ? {
            h: common_vendor.o(($event) => markDone(item), item.id)
          } : {
            i: common_vendor.o(($event) => undoDone(item), item.id)
          }, {
            j: common_vendor.o(($event) => removeTodo(item), item.id),
            k: item.id,
            l: common_vendor.n("priority-" + item.priority),
            m: common_vendor.n({
              "is-done": item.is_done
            })
          });
        })
      }, {
        d: !items.value.length,
        f: common_vendor.o(goTimeline)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-7167769e"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/todo/index.js.map
