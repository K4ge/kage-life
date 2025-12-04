"use strict";
const common_vendor = require("../../common/vendor.js");
const BASE_URL = "https://k4ge.bar/api";
const TODO_CACHE_KEY = "cached_todos";
const CACHE_TTL_MS = 2 * 60 * 1e3;
const _sfc_main = {
  __name: "index",
  setup(__props) {
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
    const tabs = [
      { key: "today", label: "今天到期" },
      { key: "all", label: "全部" },
      { key: "important", label: "仅重要" },
      { key: "done", label: "已完成" }
    ];
    const activeTab = common_vendor.ref("today");
    const allTodos = common_vendor.ref([]);
    const listLoading = common_vendor.ref(true);
    const showAdd = common_vendor.ref(false);
    const newTitle = common_vendor.ref("");
    const newDate = common_vendor.ref(todayStr());
    const newPriority = common_vendor.ref(2);
    const sortTodos = (list) => {
      return [...list].sort((a, b) => {
        const ad = a.deadline_date || "";
        const bd = b.deadline_date || "";
        const at = a.deadline_time || "";
        const bt = b.deadline_time || "";
        if ((a.is_done || 0) !== (b.is_done || 0))
          return (a.is_done || 0) - (b.is_done || 0);
        const cmpDate = ad.localeCompare(bd);
        if (cmpDate !== 0)
          return cmpDate;
        const cmpTime = at.localeCompare(bt);
        if (cmpTime !== 0)
          return cmpTime;
        const cmpPri = (b.priority || 0) - (a.priority || 0);
        if (cmpPri !== 0)
          return cmpPri;
        return (a.id || 0) - (b.id || 0);
      });
    };
    const filterByTab = (tab, list) => {
      const today = todayStr();
      if (tab === "today")
        return list.filter((i) => i.deadline_date === today);
      if (tab === "important")
        return list.filter((i) => Number(i.priority) === 3);
      if (tab === "done")
        return list.filter((i) => Number(i.is_done) === 1);
      return list;
    };
    const visibleTodos = common_vendor.computed(() => {
      const filtered = filterByTab(activeTab.value, allTodos.value || []);
      return sortTodos(filtered);
    });
    const statInfo = common_vendor.computed(() => {
      const list = visibleTodos.value;
      const done = list.filter((i) => Number(i.is_done) === 1).length;
      return {
        total: list.length,
        done,
        todo: list.length - done
      };
    });
    const statText = common_vendor.computed(() => {
      const stats = statInfo.value;
      if (activeTab.value === "done") {
        return `当前已完成 ${stats.done} 项`;
      }
      const prefix = activeTab.value === "today" ? "今日待办" : activeTab.value === "important" ? "重要待办" : "全部待办";
      return `${prefix} ${stats.todo} 项 · 已完成 ${stats.done} 项`;
    });
    const setTodos = (list) => {
      allTodos.value = sortTodos(list || []);
      try {
        common_vendor.index.setStorageSync(TODO_CACHE_KEY, { ts: Date.now(), items: allTodos.value });
      } catch (e) {
      }
    };
    const fetchTodosAll = () => {
      listLoading.value = true;
      common_vendor.index.request({
        url: `${BASE_URL}/todos/`,
        method: "GET",
        data: { tab: "all" },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            setTodos(res.data.items || []);
          } else {
            common_vendor.index.showToast({ title: "加载失败", icon: "none" });
          }
        },
        fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" }),
        complete: () => {
          listLoading.value = false;
        }
      });
    };
    common_vendor.onLoad(() => {
      try {
        const cached = common_vendor.index.getStorageSync(TODO_CACHE_KEY);
        if (cached && Array.isArray(cached.items)) {
          setTodos(cached.items);
          listLoading.value = false;
          if (cached.ts && Date.now() - cached.ts < CACHE_TTL_MS) {
            return;
          }
        }
      } catch (e) {
      }
      fetchTodosAll();
    });
    const switchTab = (tab) => {
      activeTab.value = tab;
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
            const updated = res.data.item;
            const list = allTodos.value.map((i) => i.id === updated.id ? updated : i);
            setTodos(list);
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
            const updated = res.data.item;
            const list = allTodos.value.map((i) => i.id === updated.id ? updated : i);
            setTodos(list);
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
                const list = allTodos.value.filter((t) => t.id !== item.id);
                setTodos(list);
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
    const openAdd = () => {
      newTitle.value = "";
      newDate.value = todayStr();
      newPriority.value = 2;
      showAdd.value = true;
    };
    const closeAdd = () => {
      showAdd.value = false;
    };
    const pickPriority = (val) => {
      newPriority.value = val;
    };
    const createTodo = () => {
      const title = newTitle.value.trim();
      if (!title) {
        common_vendor.index.showToast({ title: "请输入标题", icon: "none" });
        return;
      }
      common_vendor.index.request({
        url: `${BASE_URL}/todos/create/`,
        method: "POST",
        data: {
          title,
          deadline_date: newDate.value,
          priority: newPriority.value
        },
        success: (res) => {
          var _a;
          if (res.statusCode === 201) {
            closeAdd();
            const newItem = (_a = res.data) == null ? void 0 : _a.item;
            if (newItem) {
              const list = [...allTodos.value, newItem];
              setTodos(list);
            } else {
              fetchTodosAll();
            }
            common_vendor.index.showToast({ title: "已添加", icon: "success" });
          } else {
            common_vendor.index.showToast({ title: "添加失败", icon: "none" });
          }
        },
        fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" })
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
      }, listLoading.value ? {} : !visibleTodos.value.length ? {} : {
        e: common_vendor.f(visibleTodos.value, (item, k0, i0) => {
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
        d: !visibleTodos.value.length,
        f: common_vendor.o(goTimeline),
        g: common_vendor.o(openAdd),
        h: showAdd.value
      }, showAdd.value ? {
        i: newTitle.value,
        j: common_vendor.o(($event) => newTitle.value = $event.detail.value),
        k: common_vendor.t(newDate.value),
        l: newDate.value,
        m: common_vendor.o((e) => {
          newDate.value = e.detail.value;
        }),
        n: newPriority.value === 3 ? 1 : "",
        o: common_vendor.o(($event) => pickPriority(3)),
        p: newPriority.value === 2 ? 1 : "",
        q: common_vendor.o(($event) => pickPriority(2)),
        r: newPriority.value === 1 ? 1 : "",
        s: common_vendor.o(($event) => pickPriority(1)),
        t: common_vendor.o(closeAdd),
        v: common_vendor.o(createTodo),
        w: common_vendor.o(() => {
        }),
        x: common_vendor.o(closeAdd)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-7167769e"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/todo/index.js.map
