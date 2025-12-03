# life/models.py
from django.db import models


class Event(models.Model):
    id = models.BigAutoField(primary_key=True)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    event_type = models.CharField(max_length=50)
    title = models.CharField(max_length=255, blank=True)
    note = models.TextField(null=True, blank=True)

    duration_min = models.IntegerField(null=True, blank=True)
    value_number = models.DecimalField(max_digits=10, decimal_places=2,
                                       null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2,
                                 null=True, blank=True)
    bool_result = models.BooleanField(null=True, blank=True)

    location_text = models.CharField(max_length=255, null=True, blank=True)

    is_private = models.BooleanField(default=False)
    show_on_home = models.BooleanField(default=True)

    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = 'kage_events'   # 对应你 MySQL 里的表名
        managed = False            # 已有表，Django 不负责创建/修改

    def __str__(self):
        return f'{self.date} {self.start_time} {self.title}'

class EventType(models.Model):
    id = models.BigAutoField(primary_key=True)
    type_name = models.CharField(max_length=50, unique=True, verbose_name="英文类型名")
    display_name = models.CharField(max_length=100, verbose_name="显示名称")
    description = models.CharField(max_length=255, blank=True, null=True, verbose_name="描述")
    default_metadata_schema = models.JSONField(blank=True, null=True, verbose_name="Metadata 模板")

    class Meta:
        db_table = "kage_event_types"
        verbose_name = "事件类型"
        verbose_name_plural = "事件类型"

    def __str__(self):
        return self.display_name


class Todo(models.Model):
    """
    映射 kage_todos 待办表
    """
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=255)
    priority = models.SmallIntegerField(default=2)  # 1=不急 2=普通 3=重要
    deadline_date = models.DateField(null=True, blank=True)
    deadline_time = models.TimeField(null=True, blank=True)
    is_done = models.SmallIntegerField(default=0)  # 0 未完成 1 已完成
    done_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "kage_todos"
        managed = False  # 已有表，保持手工管理

    def __str__(self):
        return f"{self.title} ({'done' if self.is_done else 'todo'})"
