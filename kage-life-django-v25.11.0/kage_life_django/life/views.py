from django.shortcuts import render

# Create your views here.
# life/views.py
import json
from datetime import datetime
from zoneinfo import ZoneInfo

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Event, EventType, Todo


@require_GET
def event_list(request):
    """
    GET /api/events
    可选：?date=2025-11-30  只查某一天
    """
    date_str = request.GET.get('date')

    qs = Event.objects.all().order_by('date', 'start_time', 'id')

    if date_str:
        # 字符串格式 'YYYY-MM-DD'，Django 会自动按日期来过滤
        qs = qs.filter(date=date_str)

    data = []
    for e in qs:
        data.append({
            'id': e.id,
            'date': e.date.isoformat(),
            'start_time': e.start_time.strftime('%H:%M') if e.start_time else None,
            'end_time': e.end_time.strftime('%H:%M') if e.end_time else None,
            'event_type': e.event_type,
            'title': e.title,
            'note': e.note,
            'duration_min': e.duration_min,
            'value_number': float(e.value_number) if e.value_number is not None else None,
            'amount': float(e.amount) if e.amount is not None else None,
            'bool_result': e.bool_result,
            'location_text': e.location_text,
            'is_private': e.is_private,
            'show_on_home': e.show_on_home,
        })

    return JsonResponse(
        {'events': data},
        json_dumps_params={'ensure_ascii': False}
    )

@require_GET
def event_type(request):
    """
    GET /api/event_types
    """
    qs = EventType.objects.all().order_by('id')
    data = []
    for e in qs:
        data.append({
            'id': e.id,
            'type_name' : e.type_name,
            'description' :e.description,
            'default_metadata_schema' :e.default_metadata_schema
        })
    return JsonResponse(
        {'event_types': data},
        json_dumps_params={'ensure_ascii': False}
    )


@csrf_exempt
@require_GET
def event_create(request):
    """
    GET /api/events/create/?title=xxx&start_time=HH:MM
    接收 title 和 start_time 并写入 kage_events，其他必填字段使用默认值。
    """
    title = request.GET.get('title')
    start_time_str = request.GET.get('start_time')

    if not title:
        return JsonResponse({'error': 'title is required'}, status=400)

    # 简单解析 HH:MM，若格式不对则返回 400
    parsed_start_time = None
    if start_time_str:
        try:
            parsed_start_time = datetime.strptime(start_time_str, "%H:%M").time()
        except ValueError:
            return JsonResponse({'error': 'start_time format must be HH:MM'}, status=400)

    local_now = timezone.now().astimezone(ZoneInfo('Asia/Shanghai'))
    event = Event.objects.create(
        date=local_now.date(),
        event_type='general',
        title=title,
        start_time=parsed_start_time,
        created_at=local_now,
        updated_at=local_now,
    )

    return JsonResponse(
        {
            'id': event.id,
            'title': event.title,
            'start_time': event.start_time.strftime('%H:%M') if event.start_time else None
        },
        status=201,
        json_dumps_params={'ensure_ascii': False},
    )


@csrf_exempt
@require_http_methods(["POST"])
def event_update(request, event_id: int):
    """
    POST /api/events/<id>/update/
    body/form: title, start_time(HH:MM), event_type, value_number
    """
    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return JsonResponse({'error': 'not found'}, status=404)

    payload = {}
    if request.body:
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except Exception:
            payload = {}

    def _get(key):
        return request.POST.get(key) if key in request.POST else payload.get(key)

    title = _get('title')
    start_time_str = _get('start_time')
    event_type = _get('event_type')
    value_number = _get('value_number')

    if title is not None:
        event.title = title

    if event_type is not None:
        event.event_type = event_type

    if start_time_str is not None:
        if str(start_time_str).strip() == "":
            event.start_time = None
        else:
            try:
                event.start_time = datetime.strptime(str(start_time_str).strip(), "%H:%M").time()
            except ValueError:
                return JsonResponse({'error': 'start_time format must be HH:MM'}, status=400)

    if value_number is not None:
        value_str = str(value_number).strip()
        if value_str == "":
            event.value_number = None
        else:
            try:
                event.value_number = float(value_str)
            except (TypeError, ValueError):
                return JsonResponse({'error': 'value_number must be a number'}, status=400)

    event.updated_at = timezone.now().astimezone(ZoneInfo('Asia/Shanghai'))
    event.save()

    return JsonResponse({
        'id': event.id,
        'title': event.title,
        'start_time': event.start_time.strftime('%H:%M') if event.start_time else None,
        'event_type': event.event_type,
        'value_number': float(event.value_number) if event.value_number is not None else None,
    }, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
@require_http_methods(["POST"])
def event_delete(request, event_id: int):
    """
    POST /api/events/<id>/delete/
    """
    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return JsonResponse({'error': 'not found'}, status=404)

    event.delete()
    return JsonResponse({'status': 'ok'})

def _serialize_todo(todo):
    done_at_str = None
    if todo.done_at:
        try:
            done_at_str = timezone.localtime(todo.done_at).strftime('%Y-%m-%d %H:%M')
        except Exception:
            done_at_str = todo.done_at.strftime('%Y-%m-%d %H:%M')

    return {
        'id': todo.id,
        'title': todo.title,
        'priority': todo.priority,
        'deadline_date': todo.deadline_date.isoformat() if todo.deadline_date else None,
        'deadline_time': todo.deadline_time.strftime('%H:%M') if todo.deadline_time else None,
        'is_done': int(todo.is_done),
        'done_at': done_at_str,
        'event_id': todo.event_id,
        'note': todo.note or '',
    }


@require_GET
def todo_list(request):
    """
    GET /api/todos?tab=all|today|important|done
    - all: 所有
    - today: 截止日期为今天
    - important: 仅 priority=3
    - done: 已完成且截止日期为今天
    """
    tab = request.GET.get('tab', 'all')
    today = timezone.localdate()

    qs = Todo.objects.all()
    if tab == 'today':
        qs = qs.filter(deadline_date=today)
    elif tab == 'important':
        qs = qs.filter(priority=3)
    elif tab == 'done':
        qs = qs.filter(is_done=1, deadline_date=today)
    else:
        tab = 'all'

    # 未完成优先，其次截止日期/时间，重要性高在前
    qs = qs.order_by('is_done', 'deadline_date', 'deadline_time', '-priority', 'id')
    data = [_serialize_todo(todo) for todo in qs]

    stats_total = qs.count()
    stats_done = qs.filter(is_done=1).count()

    return JsonResponse(
        {
            'tab': tab,
            'items': data,
            'stats': {
                'total': stats_total,
                'done': stats_done,
                'todo': stats_total - stats_done,
            },
        },
        json_dumps_params={'ensure_ascii': False},
    )


@csrf_exempt
@require_http_methods(["POST"])
def todo_create(request):
    """
    POST /api/todos/create/
    body/form:
      title: 必填
      deadline_date: YYYY-MM-DD
      priority: 1/2/3 (默认2)
    其他字段走默认：is_done=0, deadline_time=None
    """
    # 兼容 form 与 json
    payload = {}
    if request.body:
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except Exception:
            payload = {}

    title = request.POST.get('title') or payload.get('title')
    if not title:
        return JsonResponse({'error': 'title is required'}, status=400)

    deadline_date = request.POST.get('deadline_date') or payload.get('deadline_date')
    parsed_date = None
    if deadline_date:
        try:
            parsed_date = datetime.strptime(deadline_date, "%Y-%m-%d").date()
        except ValueError:
            return JsonResponse({'error': 'deadline_date must be YYYY-MM-DD'}, status=400)

    priority = request.POST.get('priority') or payload.get('priority') or 2
    try:
        priority = int(priority)
    except Exception:
        priority = 2
    if priority not in (1, 2, 3):
        priority = 2

    now_local = timezone.now().astimezone(ZoneInfo('Asia/Shanghai'))
    todo = Todo.objects.create(
        title=title,
        priority=priority,
        deadline_date=parsed_date,
        deadline_time=None,
        is_done=0,
        done_at=None,
        note=None,
        created_at=now_local,
        updated_at=now_local,
    )

    return JsonResponse({'item': _serialize_todo(todo)}, status=201, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
@require_http_methods(["POST"])
def todo_status(request, todo_id: int):
    """
    POST /api/todos/<id>/status
    body/form: {is_done: 1|0}
    """
    try:
        todo = Todo.objects.get(pk=todo_id)
    except Todo.DoesNotExist:
        return JsonResponse({'error': 'not found'}, status=404)

    # 兼容 form 和 json
    payload = {}
    if request.body:
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except Exception:
            payload = {}
    is_done_raw = request.POST.get('is_done', payload.get('is_done'))
    if is_done_raw is None:
        return JsonResponse({'error': 'is_done is required'}, status=400)

    is_done_flag = 1 if str(is_done_raw) in ['1', 'true', 'True', 'yes', 'on'] else 0
    now_local = timezone.localtime(timezone.now())

    created_event = None

    if is_done_flag:
        # 已完成：若没有关联事件则新建
        if not todo.event_id:
            # 取待办的截止时间作为起点，如果没有则用当前北京时间的时分
            if todo.deadline_time:
                start_time_val = todo.deadline_time
            else:
                start_time_val = now_local.time()

            event = Event.objects.create(
                date=todo.deadline_date or now_local.date(),
                event_type="todo",
                title=todo.title,
                start_time=start_time_val,
                created_at=now_local,
                updated_at=now_local,
            )
            todo.event_id = event.id
            created_event = event.id
        todo.done_at = now_local
    else:
        # 撤销完成：删除关联事件
        if todo.event_id:
            try:
                Event.objects.filter(id=todo.event_id).delete()
            except Exception:
                pass
            todo.event_id = None
        todo.done_at = None

    todo.is_done = is_done_flag
    todo.updated_at = now_local
    todo.save(update_fields=['is_done', 'done_at', 'updated_at', 'event_id'])

    return JsonResponse(
        {'item': _serialize_todo(todo), 'created_event_id': created_event},
        json_dumps_params={'ensure_ascii': False},
    )


@csrf_exempt
@require_http_methods(["POST"])
def todo_delete(request, todo_id: int):
    """
    POST /api/todos/<id>/delete
    """
    try:
        todo = Todo.objects.get(pk=todo_id)
    except Todo.DoesNotExist:
        return JsonResponse({'error': 'not found'}, status=404)

    todo.delete()
    return JsonResponse({'status': 'ok'})
