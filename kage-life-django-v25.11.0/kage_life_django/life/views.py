from django.shortcuts import render

# Create your views here.
# life/views.py
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from datetime import datetime

from .models import Event
from .models import EventType


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

    china_tz = pytz.timezone('Asia/Shanghai')
    utc_now = timezone.now()
    local_now = utc_now.astimezone(china_tz)
    event = Event.objects.create(
        date=local_now.date(),
        event_type='general',
        title=title,
        start_time=parsed_start_time,
        created_at=local_now,
        updated_at=local_now,
    )

    return JsonResponse(
        {'id': event.id, 'title': event.title, 'start_time': event.start_time.strftime('%H:%M') if event.start_time else None},
        status=201,
        json_dumps_params={'ensure_ascii': False},
    )
