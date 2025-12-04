"use strict";
const common_vendor = require("../../common/vendor.js");
const BASE_URL = "https://k4ge.bar/api";
const TODO_CACHE_KEY = "cached_todos";
const CACHE_TTL_MS = 2 * 60 * 1e3;
const EVENT_CACHE_PREFIX = "cached_events";
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
      const toMs = (d) => {
        if (!d)
          return null;
        const [y, m, day] = d.split("-").map(Number);
        return new Date(y, m - 1, day).getTime();
      };
      const todayMs = toMs(today);
      if (tab === "today") {
        return list.filter((i) => {
          const ms = toMs(i.deadline_date);
          if (ms === null)
            return false;
          if (Number(i.is_done) === 1) {
            return ms === todayMs;
          }
          return ms <= todayMs;
        });
      }
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
    const normalizeTodo = (t) => ({
      ...t,
      is_done: Number(t.is_done) || 0,
      priority: Number(t.priority) || 0
    });
    const setTodos = (list) => {
      allTodos.value = sortTodos((list || []).map(normalizeTodo));
      try {
        common_vendor.index.setStorageSync(TODO_CACHE_KEY, { ts: Date.now(), items: allTodos.value });
      } catch (e) {
      }
    };
    const applyLocalStatus = (todoId, isDoneFlag) => {
      const nowStr = (() => {
        const d = /* @__PURE__ */ new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${y}-${m}-${day} ${hh}:${mm}`;
      })();
      const updated = allTodos.value.map((i) => {
        if (i.id !== todoId)
          return i;
        return normalizeTodo({
          ...i,
          is_done: isDoneFlag ? 1 : 0,
          done_at: isDoneFlag ? nowStr : null
        });
      });
      setTodos(updated);
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
      if (!dateStr)
        return "未设置";
      const toMs = (d) => {
        const [y, m, day] = d.split("-").map(Number);
        return new Date(y, m - 1, day).getTime();
      };
      const today = todayStr();
      const todayMs = toMs(today);
      const ms = toMs(dateStr);
      let label = "";
      if (isDone(item)) {
        if (ms === todayMs)
          label = "今天";
        else
          label = dateStr;
      } else {
        if (ms === todayMs) {
          label = "今天";
        } else if (ms < todayMs) {
          const diffDays = Math.max(1, Math.round((todayMs - ms) / 864e5));
          label = `逾期${diffDays}天`;
        } else {
          label = dateStr;
        }
      }
      return label;
    };
    const markDone = (item) => {
      const eventDate = item.deadline_date || todayStr();
      applyLocalStatus(item.id, 1);
      common_vendor.index.request({
        url: `${BASE_URL}/todos/${item.id}/status/`,
        method: "POST",
        data: { is_done: 1 },
        success: (res) => {
          var _a;
          if (res.statusCode === 200 && ((_a = res.data) == null ? void 0 : _a.item)) {
            const updated = normalizeTodo({ ...res.data.item, is_done: 1 });
            const list = allTodos.value.map((i) => i.id === updated.id ? updated : i);
            setTodos(list);
            refreshEventCache(eventDate);
          } else {
            common_vendor.index.showToast({ title: "操作失败", icon: "none" });
          }
        },
        fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" })
      });
    };
    const undoDone = (item) => {
      const eventDate = item.deadline_date || todayStr();
      applyLocalStatus(item.id, 0);
      common_vendor.index.request({
        url: `${BASE_URL}/todos/${item.id}/status/`,
        method: "POST",
        data: { is_done: 0 },
        success: (res) => {
          var _a;
          if (res.statusCode === 200 && ((_a = res.data) == null ? void 0 : _a.item)) {
            const updated = normalizeTodo({ ...res.data.item, is_done: 0 });
            const list = allTodos.value.map((i) => i.id === updated.id ? updated : i);
            setTodos(list);
            refreshEventCache(eventDate);
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
                refreshEventCache(item.deadline_date || todayStr());
              } else {
                common_vendor.index.showToast({ title: "删除失败", icon: "none" });
              }
            },
            fail: () => common_vendor.index.showToast({ title: "网络异常", icon: "none" })
          });
        }
      });
    };
    const isDone = (todo) => Number(todo == null ? void 0 : todo.is_done) === 1;
    const cardClasses = (item) => {
      const done = isDone(item);
      return ["priority-" + item.priority, done ? "is-done" : "not-done"];
    };
    const goTimeline = () => {
      common_vendor.index.redirectTo({
        url: "/pages/index/index"
      });
    };
    const eventCacheKey = (date) => `${EVENT_CACHE_PREFIX}_${date || todayStr()}`;
    const refreshEventCache = (dateParam) => {
      const date = dateParam || todayStr();
      common_vendor.index.request({
        url: `${BASE_URL}/events/`,
        method: "GET",
        data: { date },
        success: (res) => {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.events)) {
            const list = res.data.events.map((e) => ({
              id: e.id,
              time: e.start_time || "",
              title: e.title || "",
              raw: e
            }));
            common_vendor.index.setStorageSync(eventCacheKey(date), { ts: Date.now(), items: list });
          }
        }
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
            b: isDone(item) ? 1 : "",
            c: deadlineLabel(item)
          }, deadlineLabel(item) ? {
            d: common_vendor.t(deadlineLabel(item))
          } : {}, {
            e: item.note
          }, item.note ? {
            f: common_vendor.t(item.note)
          } : {}, {
            g: !isDone(item)
          }, !isDone(item) ? {
            h: common_vendor.o(($event) => markDone(item), item.id)
          } : {
            i: common_vendor.o(($event) => undoDone(item), item.id)
          }, {
            j: common_vendor.o(($event) => removeTodo(item), item.id),
            k: item.id,
            l: common_vendor.n(cardClasses(item))
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
