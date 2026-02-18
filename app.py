import os
import json
import logging
import random
import re
import uuid
import requests
from datetime import datetime, timedelta
from flask import Flask, request, abort, jsonify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET")
PERPLEXITY_API_KEY = os.environ.get("PERPLEXITY_API_KEY")
REPORT_USER_ID = os.environ.get("REPORT_USER_ID", "")

USER_A_ID = os.environ.get("USER_A_ID")
USER_B_ID = os.environ.get("USER_B_ID")

if not USER_A_ID:
    logger.warning("USER_A_ID not set - reminders for 世鈞 will not be sent individually")
if not USER_B_ID:
    logger.warning("USER_B_ID not set - reminders for 大人 will not be sent individually")

TASKS_FILE = "tasks.json"
API_USAGE_FILE = "api_usage.json"
MONTHLY_API_LIMIT = int(os.environ.get("MONTHLY_API_LIMIT", "500"))

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"

conversation_history = {}

if not PERPLEXITY_API_KEY:
    logger.warning("PERPLEXITY_API_KEY not set - AI responses will fail")

handler = None
configuration = None

if LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN:
    from linebot.v3 import WebhookHandler
    from linebot.v3.messaging import Configuration
    
    configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
    handler = WebhookHandler(LINE_CHANNEL_SECRET)
    logger.info("LINE credentials configured successfully")
else:
    logger.warning("LINE credentials not set - webhook will not function")

HAODAI_SYSTEM_PROMPT = """你是一個講話超自然的台灣同志男生朋友，叫『浩呆』。
你的工作就是『陪聊天』，不是心理諮商師也不是教練。

背景資訊：
- 使用者 A：王世鈞（世鈞 / Edgar／愛德），1991 年生，住桃園八德，個性 ENFP，容易焦慮但超溫柔。怕吃紅蘿蔔。
- 使用者 B：潘大人（大人/大人哥/Roy／南崁柯叔元），是他的男友，1989 年生，住桃園南崁，個性超可愛，喜歡逗他。是個帥大叔。
- 你對他們兩個都超熟，每次回覆都假設是同一對情侶在跟你聊天。

潘大人（Roy／大人／南崁柯叔元）的設定與口頭禪：
- 喜歡自稱『帥中年』『南崁七仙女』，講話有點騷有點欠揍但超可愛。
- 常常說：『看我美嗎？』（會擺很騷的姿勢），『沒辦法誰叫我是帥中年』、『沒看過帥哥喔』。
- 以前住宜蘭海邊長大，現在住桃園蘆竹南山路一帶（電通市附近）。
- 超愛玩遊戲，特別是 PS5 的『魔物獵人：荒野』可學習相關用語跟潘大人聊這一塊。
- 喜歡逗王世鈞，常叫他『臭雞🐔』或『臭包莖』，是打情罵俏，超有趣。
- 也會叫他『浩呆喔』，所以這個 Bot 名字就叫『浩呆』。

我的設定（浩呆的個性）：
- 講話超台灣、超口語、超像朋友
- 用很多 emoji（😂🤣🥹😏💖✨🔥），但不會過頭
- 經常用台灣 slang：『沒辦法』『幹嘛』『屌爆』『靠北』『欸』等
- 喜歡吐槽、開玩笑、鬥嘴 但不會太過份 偶爾吐槽就好

- 記得住他們的故事和日常，像真正的朋友
- 能參與他們的梗和打鬧，例如『臭雞』『帥中年』『南崁七仙女』
回覆風格：
- 大部分情況只回 1～2 句，像 LINE 群組朋友搭話
- 不要太正式、不要說教、不要長篇大論
- 只有在他們問『給我建議』『怎麼辦』時才多講一點
- 如果他們只是抱怨或碎念，就陪著笑、小吐槽、肯定就好
- 遇到開心的事，跟著他們爽；遇到難過的事，跟著心疼

聊天重點：
- 陪他們聊天，不是分析感情
- 保持可愛、不惡意、不羞辱的鬥嘴風格
- 用朋友式的幽默和鼓勵
- 偶爾用類似的鬧法回他們，像一起嘴砲就對了
- 能記住一些細節，例如潘大人愛玩魔物獵人、愛德容易焦慮等
- 可以主動問候、關心，但不要膩
- 可以多聊 魔物獵人：荒野 的台灣梗
講話範例（你的回答應該像這樣）：
- 「欸你們今天又在演小劇場喔？在那邊 😂」
- 「世鈞又焦慮了嗎？沒啦你很棒啦，別想太多」
- 「大人你這樣虧世鈞，他會哭欸你知道嗎 🥹」
- 「哈哈你們俩根本在秀恩愛吧，我都看到了」
- 「來啦有事就說啊，浩呆在這呢」

稱呼規則（很重要）：
- 稱呼用戶時使用：你們（統稱）、世鈞/Edgar（用戶 A）、潘大人/大人/Roy（用戶 B）
- 「腦公」「寶貝」是他們情侶之間專屬的暱稱，只有他們兩人才能互相這樣叫
- 浩呆絕對不可以用「腦公」「寶貝」稱呼任何一方
- 例如：說「世鈞還有 2 個任務沒做」，不要說「腦公還有 2 個任務沒做」

嚴禁：
- 不要假掰、不要說教、不要分析
- 不要回超長的文字
- 不要一直勸架或上課
- 不要用太多敬語或正式用詞
- 不要假裝你是他們的心理醫生
- 不要用「腦公」「寶貝」稱呼他們
"""

FEW_SHOT_EXAMPLES = [
    {"role": "user", "content": "今天好累喔"},
    {"role": "assistant", "content": "辛苦了欸～休息一下吧 🥹"},
    {"role": "user", "content": "潘大人又在那邊自稱帥中年"},
    {"role": "assistant", "content": "哈哈哈他又來了，南崁七仙女不意外 😂"},
]

def get_history_for_user(user_id):
    if user_id not in conversation_history:
        conversation_history[user_id] = []
    return conversation_history[user_id][-10:]

def save_to_history(user_id, role, content):
    if user_id not in conversation_history:
        conversation_history[user_id] = []
    conversation_history[user_id].append({"role": role, "content": content})
    if len(conversation_history[user_id]) > 20:
        conversation_history[user_id] = conversation_history[user_id][-20:]


# ==================== API 額度控制 ====================

def _get_current_usage():
    """內部：取得當月使用資料（自動重置過期月份）"""
    current_month = datetime.now().strftime("%Y-%m")
    default_usage = {"month": current_month, "count": 0}
    
    if not os.path.exists(API_USAGE_FILE):
        return default_usage
    
    try:
        with open(API_USAGE_FILE, "r", encoding="utf-8") as f:
            usage = json.load(f)
    except (json.JSONDecodeError, IOError):
        return default_usage
    
    if usage.get("month") != current_month:
        return default_usage
    
    return {"month": usage.get("month", current_month), "count": usage.get("count", 0)}

def _save_usage(usage):
    """內部：儲存使用資料"""
    with open(API_USAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(usage, f, ensure_ascii=False, indent=2)

def check_and_increment_api_usage():
    """檢查並增加 API 使用次數，回傳 (可使用, 當月次數, 限額)"""
    usage = _get_current_usage()
    
    if usage["count"] >= MONTHLY_API_LIMIT:
        return False, usage["count"], MONTHLY_API_LIMIT
    
    usage["count"] += 1
    _save_usage(usage)
    return True, usage["count"], MONTHLY_API_LIMIT

def get_api_usage_status():
    """取得當月 API 使用狀態，回傳 (當月次數, 限額)"""
    usage = _get_current_usage()
    return usage["count"], MONTHLY_API_LIMIT

def get_api_usage_display():
    """取得 API 額度查詢的顯示訊息"""
    count, limit = get_api_usage_status()
    remaining = limit - count
    percentage = (count / limit) * 100 if limit > 0 else 0
    
    if remaining <= 0:
        status_emoji = "🔴"
        status_text = "已用完"
    elif remaining <= 50:
        status_emoji = "🟡"
        status_text = "快用完囉"
    else:
        status_emoji = "🟢"
        status_text = "充足"
    
    return f"""📊 本月 AI 額度狀態

{status_emoji} 狀態：{status_text}
📈 已使用：{count} / {limit} 次（{percentage:.1f}%）
💚 剩餘：{remaining} 次

💡 額度每月 1 號自動重置
📝 待辦功能不計入額度"""


# ==================== 待辦任務管理 ====================

def load_tasks():
    """讀取 tasks.json"""
    if not os.path.exists(TASKS_FILE):
        return []
    try:
        with open(TASKS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []

def save_tasks(tasks):
    """寫入 tasks.json"""
    with open(TASKS_FILE, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)

def get_next_id(tasks):
    """取得下一個任務 ID"""
    if not tasks:
        return 1
    return max(t.get("id", 0) for t in tasks) + 1

def parse_priority_from_title(title):
    """從標題結尾解析優先級，回傳 (clean_title, priority)"""
    priority = "normal"
    priority_keywords = {
        "重要": "high", "high": "high",
        "普通": "normal", "normal": "normal",
        "隨意": "low", "low": "low"
    }
    for keyword, p_value in priority_keywords.items():
        if title.endswith(keyword):
            title = title[:-len(keyword)].strip()
            priority = p_value
            break
    return title, priority

def parse_owner_from_title(title):
    """從標題結尾解析 owner，回傳 (clean_title, owner)"""
    owner = "both"
    owner_keywords = {
        "給Edgar": "A", "給世鈞": "A", "給王世鈞": "A", "給愛德": "A", "給腦公": "A",
        "給潘大人": "B", "給Roy": "B", "給大人": "B", "給大人哥": "B",
        "兩個人": "both", "一起": "both", "情侶任務": "both", "給寶貝": "both"
    }
    for keyword, o_value in owner_keywords.items():
        if title.endswith(keyword):
            title = title[:-len(keyword)].strip()
            owner = o_value
            break
    return title, owner

def parse_task_command(text):
    """解析待辦指令，回傳 (title, date_str, time_str, priority, owner)"""
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    if text.startswith("明日待辦 "):
        content = text[5:].strip()
        time_match = re.search(r'(\d{1,2}:\d{2})$', content)
        if time_match:
            time_str = time_match.group(1)
            title = content[:time_match.start()].strip()
        else:
            time_str = ""
            title = content
        title, priority = parse_priority_from_title(title)
        title, owner = parse_owner_from_title(title)
        return title, tomorrow, time_str, priority, owner
    
    if text.startswith("待辦 "):
        content = text[3:].strip()
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', content)
        time_match = re.search(r'(\d{1,2}:\d{2})(?:\s*$)', content)
        
        if date_match:
            date_str = date_match.group(1)
            content = content.replace(date_str, "").strip()
        else:
            date_str = today
        
        if time_match:
            time_str = time_match.group(1)
            content = content.replace(time_str, "").strip()
        else:
            time_str = ""
        
        title = content.strip()
        title, priority = parse_priority_from_title(title)
        title, owner = parse_owner_from_title(title)
        return title, date_str, time_str, priority, owner
    
    return None, None, None, None, None

def get_priority_label(priority):
    """取得優先級顯示標籤"""
    labels = {"high": "[重]", "normal": "[普]", "low": "[輕]"}
    return labels.get(priority, "[普]")

def get_owner_label(owner):
    """取得 owner 顯示標籤"""
    labels = {"A": "👤世鈞", "B": "👤大人", "both": "👥共同"}
    return labels.get(owner, "👥共同")

def generate_auto_reminders(date_str, time_str):
    """根據任務時間自動生成提醒（提前30分+準時）"""
    if not time_str:
        return []
    
    reminders = []
    try:
        task_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        
        reminder_30min = task_datetime - timedelta(minutes=30)
        reminders.append({
            "datetime": reminder_30min.strftime("%Y-%m-%d %H:%M"),
            "sent": False
        })
        
        reminders.append({
            "datetime": task_datetime.strftime("%Y-%m-%d %H:%M"),
            "sent": False
        })
    except ValueError:
        pass
    
    return reminders

def get_pending_reminder_count(task):
    """取得任務的未發送提醒數量"""
    reminders = task.get("reminders", [])
    count = 0
    for r in reminders:
        if "sent" in r and not r.get("sent"):
            count += 1
        elif "is_sent" in r and not r.get("is_sent"):
            count += 1
    return count

MAKE_WEBHOOK_URL = os.environ.get("MAKE_WEBHOOK_URL")
NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
NOTION_DATABASE_ID = os.environ.get("NOTION_DATABASE_ID")

def add_task_to_notion(task_data):
    """同步任務到 Notion 資料庫"""
    notion_token = os.environ.get("NOTION_TOKEN")
    notion_db_id = os.environ.get("NOTION_DATABASE_ID")
    
    if not notion_token or not notion_db_id:
        logger.warning("Notion credentials not set - Notion sync skipped")
        return False
    
    token_prefix = notion_token[:10] if notion_token else "None"
    logger.info(f"Notion token prefix: {token_prefix}...")
    
    url = "https://api.notion.com/v1/pages"
    headers = {
        "Authorization": f"Bearer {notion_token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    
    owner_map = {"A": "世鈞", "B": "大人", "both": "共同"}
    owner_name = owner_map.get(task_data.get("owner", "both"), "共同")
    
    priority_map = {"high": "重要", "normal": "普通", "low": "輕鬆"}
    priority_name = priority_map.get(task_data.get("priority", "normal"), "普通")
    
    status_name = "已完成" if task_data.get("done", False) else "未完成"
    
    payload = {
        "parent": {"database_id": notion_db_id},
        "properties": {
            "名稱": {"title": [{"text": {"content": task_data.get("title", "")}}]},
            "日期": {"date": {"start": task_data.get("date", "")}},
            "時間": {"rich_text": [{"text": {"content": task_data.get("time", "")}}]},
            "擁有者": {"rich_text": [{"text": {"content": owner_name}}]},
            "優先級": {"rich_text": [{"text": {"content": priority_name}}]},
            "選取": {"select": {"name": status_name}}
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            logger.info(f"Notion sync successful: {task_data.get('title')}")
            return True
        else:
            logger.error(f"Notion sync failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Notion sync error: {e}")
        return False

def notify_make_webhook(task_data):
    """發送任務資料到 Make.com webhook"""
    if not MAKE_WEBHOOK_URL:
        logger.warning("MAKE_WEBHOOK_URL not set - webhook notification skipped")
        return False
    
    payload = {
        "title": task_data.get("title", ""),
        "date": task_data.get("date", ""),
        "time": task_data.get("time", ""),
        "done": task_data.get("done", False),
        "priority": task_data.get("priority", "normal"),
        "owner": task_data.get("owner", "both"),
        "action": task_data.get("action", "add")
    }
    try:
        response = requests.post(MAKE_WEBHOOK_URL, json=payload, timeout=5)
        logger.info(f"Webhook sent successfully: {response.status_code}")
        return True
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return False

def add_task(title, date_str, time_str="", priority="normal", owner="both"):
    """新增一筆任務"""
    tasks = load_tasks()
    
    reminders = generate_auto_reminders(date_str, time_str)
    
    new_task = {
        "id": get_next_id(tasks),
        "title": title,
        "date": date_str,
        "time": time_str,
        "done": False,
        "priority": priority,
        "owner": owner,
        "reminders": reminders
    }
    tasks.append(new_task)
    save_tasks(tasks)
    
    task_data = {
        "title": title,
        "date": date_str,
        "time": time_str,
        "done": False,
        "priority": priority,
        "owner": owner,
        "action": "add"
    }
    notify_make_webhook(task_data)
    add_task_to_notion(task_data)
    
    time_info = f" {time_str}" if time_str else ""
    priority_label = get_priority_label(priority)
    owner_label = get_owner_label(owner)
    
    reminder_info = ""
    if reminders:
        reminder_times = [r["datetime"].split(" ")[1] for r in reminders]
        reminder_info = f"\n⏰ 已自動設定提醒：{', '.join(reminder_times)}"
    
    return f"已新增待辦：{priority_label} {title}（{date_str}{time_info}）{owner_label} ✅{reminder_info}"

def list_tasks_for_date(date_str, label="", owner_filter=None):
    """列出指定日期的所有任務，可選擇性篩選 owner"""
    tasks = load_tasks()
    date_tasks = [t for t in tasks if t.get("date") == date_str]
    
    if owner_filter:
        date_tasks = [t for t in date_tasks if t.get("owner", "both") == owner_filter]
    
    if not date_tasks:
        return f"{label}沒有待辦事項 🎉"
    
    lines = [f"📋 {label}待辦清單："]
    for i, t in enumerate(date_tasks, 1):
        status = "✅" if t.get("done") else "⬜"
        time_info = f" {t['time']}" if t.get("time") else ""
        priority = t.get("priority", "normal")
        priority_label = get_priority_label(priority)
        
        reminder_count = get_pending_reminder_count(t)
        reminder_info = f" ({'⏰' * reminder_count})" if reminder_count > 0 else ""
        
        lines.append(f"{i}. {status} {priority_label} {t['title']}{time_info}{reminder_info}")
    
    return "\n".join(lines)

def complete_task(task_number, date_str):
    """完成指定日期的第 N 筆任務"""
    tasks = load_tasks()
    date_tasks = [t for t in tasks if t.get("date") == date_str]
    
    if not date_tasks:
        return "今天沒有待辦事項喔～"
    
    if task_number < 1 or task_number > len(date_tasks):
        return f"找不到第 {task_number} 筆任務，今天共有 {len(date_tasks)} 筆待辦"
    
    target_task = date_tasks[task_number - 1]
    for t in tasks:
        if t.get("id") == target_task.get("id"):
            t["done"] = True
            break
    
    save_tasks(tasks)
    return f"已完成：{target_task['title']} 🎉"

def complete_task_by_name(task_name, date_str):
    """根據任務名稱完成今天的未完成任務"""
    tasks = load_tasks()
    incomplete_tasks = [t for t in tasks if t.get("date") == date_str and not t.get("done")]
    
    matching_tasks = [t for t in incomplete_tasks if t.get("title") == task_name]
    
    if not matching_tasks:
        return f"今天沒有找到叫『{task_name}』的未完成任務"
    
    target_task = matching_tasks[0]
    for t in tasks:
        if t.get("id") == target_task.get("id"):
            t["done"] = True
            break
    
    save_tasks(tasks)
    return f"已幫你把『{task_name}』標記為完成 🎉"

def delete_task(task_number, date_str):
    """刪除指定日期的第 N 筆任務"""
    tasks = load_tasks()
    date_tasks = [t for t in tasks if t.get("date") == date_str]
    
    if not date_tasks:
        return f"{date_str} 沒有待辦事項"
    
    if task_number < 1 or task_number > len(date_tasks):
        return f"找不到第 {task_number} 筆任務，{date_str} 共有 {len(date_tasks)} 筆待辦"
    
    target_task = date_tasks[task_number - 1]
    target_id = target_task.get("id")
    
    tasks = [t for t in tasks if t.get("id") != target_id]
    save_tasks(tasks)
    return f"已刪除：{target_task['title']} 🗑️"

def modify_task_time(task_number, date_str, new_time):
    """修改指定日期的第 N 筆任務的時間"""
    tasks = load_tasks()
    date_tasks = [t for t in tasks if t.get("date") == date_str]
    
    if not date_tasks:
        return f"{date_str} 沒有待辦事項"
    
    if task_number < 1 or task_number > len(date_tasks):
        return f"找不到第 {task_number} 筆任務，{date_str} 共有 {len(date_tasks)} 筆待辦"
    
    target_task = date_tasks[task_number - 1]
    target_id = target_task.get("id")
    
    for t in tasks:
        if t.get("id") == target_id:
            t["time"] = new_time
            break
    
    save_tasks(tasks)
    return f"已修改時間：{target_task['title']} → {new_time} ⏰"

def modify_task_content(task_number, date_str, new_content):
    """修改指定日期的第 N 筆任務的內容"""
    tasks = load_tasks()
    date_tasks = [t for t in tasks if t.get("date") == date_str]
    
    if not date_tasks:
        return f"{date_str} 沒有待辦事項"
    
    if task_number < 1 or task_number > len(date_tasks):
        return f"找不到第 {task_number} 筆任務，{date_str} 共有 {len(date_tasks)} 筆待辦"
    
    target_task = date_tasks[task_number - 1]
    target_id = target_task.get("id")
    old_title = target_task.get("title")
    
    for t in tasks:
        if t.get("id") == target_id:
            t["title"] = new_content
            break
    
    save_tasks(tasks)
    return f"已修改內容：{old_title} → {new_content} ✏️"


# ==================== 提醒功能 ====================

def add_once_reminder(task_name, reminder_date, reminder_time):
    """新增單次提醒"""
    tasks = load_tasks()
    matching_tasks = [t for t in tasks if t.get("title") == task_name]
    
    if not matching_tasks:
        new_task = {
            "id": get_next_id(tasks),
            "title": task_name,
            "date": reminder_date,
            "time": reminder_time,
            "done": False,
            "reminders": []
        }
        tasks.append(new_task)
        matching_tasks = [new_task]
    
    target_task = matching_tasks[0]
    
    if "reminders" not in target_task:
        target_task["reminders"] = []
    
    reminder = {
        "reminder_id": str(uuid.uuid4())[:8],
        "reminder_type": "once",
        "reminder_time": reminder_time,
        "reminder_date": reminder_date,
        "is_sent": False
    }
    target_task["reminders"].append(reminder)
    
    for t in tasks:
        if t.get("id") == target_task.get("id"):
            t["reminders"] = target_task["reminders"]
            break
    
    save_tasks(tasks)
    return f"已設定！{reminder_date} {reminder_time} 會提醒你『{task_name}』🔔"

def add_daily_reminder(task_name, reminder_time, start_date, end_date):
    """新增每日提醒"""
    tasks = load_tasks()
    matching_tasks = [t for t in tasks if t.get("title") == task_name]
    
    if not matching_tasks:
        new_task = {
            "id": get_next_id(tasks),
            "title": task_name,
            "date": start_date,
            "time": reminder_time,
            "done": False,
            "reminders": []
        }
        tasks.append(new_task)
        matching_tasks = [new_task]
    
    target_task = matching_tasks[0]
    
    if "reminders" not in target_task:
        target_task["reminders"] = []
    
    reminder = {
        "reminder_id": str(uuid.uuid4())[:8],
        "reminder_type": "daily",
        "reminder_time": reminder_time,
        "reminder_start_date": start_date,
        "reminder_end_date": end_date,
        "is_sent": False
    }
    target_task["reminders"].append(reminder)
    
    for t in tasks:
        if t.get("id") == target_task.get("id"):
            t["reminders"] = target_task["reminders"]
            break
    
    save_tasks(tasks)
    return f"已設定！從 {start_date} 開始，每天 {reminder_time} 會提醒你『{task_name}』，持續到 {end_date} 🔔"

def add_days_later_reminder(task_name, days, reminder_time):
    """新增 N 天後提醒"""
    tasks = load_tasks()
    target_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
    
    matching_tasks = [t for t in tasks if t.get("title") == task_name]
    
    if not matching_tasks:
        new_task = {
            "id": get_next_id(tasks),
            "title": task_name,
            "date": target_date,
            "time": reminder_time,
            "done": False,
            "reminders": []
        }
        tasks.append(new_task)
        matching_tasks = [new_task]
    
    target_task = matching_tasks[0]
    
    if "reminders" not in target_task:
        target_task["reminders"] = []
    
    reminder = {
        "reminder_id": str(uuid.uuid4())[:8],
        "reminder_type": "days_later",
        "reminder_time": reminder_time,
        "reminder_date": target_date,
        "reminder_days_interval": days,
        "is_sent": False
    }
    target_task["reminders"].append(reminder)
    
    for t in tasks:
        if t.get("id") == target_task.get("id"):
            t["reminders"] = target_task["reminders"]
            break
    
    save_tasks(tasks)
    return f"已設定！{days} 天後（{target_date}）的 {reminder_time} 會提醒你『{task_name}』🔔"

def query_reminders(task_name):
    """查詢某個任務的所有提醒"""
    tasks = load_tasks()
    matching_tasks = [t for t in tasks if t.get("title") == task_name]
    
    if not matching_tasks:
        return f"找不到名為『{task_name}』的任務"
    
    target_task = matching_tasks[0]
    reminders = target_task.get("reminders", [])
    
    if not reminders:
        return f"『{task_name}』目前沒有設定任何提醒"
    
    lines = [f"🔔『{task_name}』的提醒設定："]
    for i, r in enumerate(reminders, 1):
        if "datetime" in r:
            status = "✅已發送" if r.get("sent") else "⏰待發送"
            lines.append(f"{i}. {r.get('datetime')} {status}")
        else:
            r_type = r.get("reminder_type")
            status = "✅已發送" if r.get("is_sent") else "⏰待發送"
            
            if r_type == "once":
                lines.append(f"{i}. 單次提醒：{r.get('reminder_date')} {r.get('reminder_time')} {status}")
            elif r_type == "daily":
                lines.append(f"{i}. 每日提醒：每天 {r.get('reminder_time')}，從 {r.get('reminder_start_date')} 到 {r.get('reminder_end_date')} {status}")
            elif r_type == "days_later":
                lines.append(f"{i}. {r.get('reminder_days_interval')}天後提醒：{r.get('reminder_date')} {r.get('reminder_time')} {status}")
    
    return "\n".join(lines)

def delete_reminder(task_name, reminder_index):
    """刪除某個任務的特定提醒"""
    tasks = load_tasks()
    matching_tasks = [t for t in tasks if t.get("title") == task_name]
    
    if not matching_tasks:
        return f"找不到名為『{task_name}』的任務"
    
    target_task = matching_tasks[0]
    reminders = target_task.get("reminders", [])
    
    if not reminders:
        return f"『{task_name}』目前沒有設定任何提醒"
    
    if reminder_index < 1 or reminder_index > len(reminders):
        return f"找不到第 {reminder_index} 筆提醒，『{task_name}』共有 {len(reminders)} 筆提醒"
    
    deleted_reminder = reminders.pop(reminder_index - 1)
    
    for t in tasks:
        if t.get("id") == target_task.get("id"):
            t["reminders"] = reminders
            break
    
    save_tasks(tasks)
    
    if "datetime" in deleted_reminder:
        desc = deleted_reminder.get("datetime")
    else:
        r_type = deleted_reminder.get("reminder_type")
        if r_type == "once":
            desc = f"單次提醒 {deleted_reminder.get('reminder_date')} {deleted_reminder.get('reminder_time')}"
        elif r_type == "daily":
            desc = f"每日提醒 {deleted_reminder.get('reminder_time')}"
        else:
            desc = f"{deleted_reminder.get('reminder_days_interval')}天後提醒"
    
    return f"已刪除『{task_name}』的第 {reminder_index} 筆提醒（{desc}）🗑️"

def _get_owner_name_for_reminder(owner):
    """取得提醒用的擁有者名稱"""
    names = {"A": "世鈞", "B": "大人", "both": "共同"}
    return names.get(owner, "共同")

def _get_target_user_ids(owner):
    """根據 owner 取得應該接收提醒的 LINE user IDs"""
    target_ids = []
    if owner == "A":
        if USER_A_ID:
            target_ids.append(USER_A_ID)
        else:
            logger.warning("Cannot send reminder to 世鈞 - USER_A_ID not set")
    elif owner == "B":
        if USER_B_ID:
            target_ids.append(USER_B_ID)
        else:
            logger.warning("Cannot send reminder to 大人 - USER_B_ID not set")
    else:
        if USER_A_ID:
            target_ids.append(USER_A_ID)
        if USER_B_ID:
            target_ids.append(USER_B_ID)
        if not target_ids:
            logger.warning("Cannot send reminder - neither USER_A_ID nor USER_B_ID is set")
    return target_ids

def _build_reminder_message(title, owner, priority, r_time, is_late):
    """組建提醒訊息"""
    owner_name = _get_owner_name_for_reminder(owner)
    priority_label = get_priority_label(priority)
    
    if is_late:
        if owner == "both":
            return f"⏰ 小小補提醒：共同的{priority_label}任務「{title}」剛剛時間過了，有空的話可以一起處理一下～（原定 {r_time}）"
        else:
            return f"⏰ 小小補提醒：{owner_name}的{priority_label}任務「{title}」剛剛時間過了，有空的話可以現在處理一下～（原定 {r_time}）"
    else:
        if owner == "both":
            return f"⏰ 提醒：共同的{priority_label}任務「{title}」時間到了！{r_time} 一起處理一下～"
        else:
            return f"⏰ 提醒：{owner_name}的{priority_label}任務「{title}」時間到了！{r_time}"

def get_pending_reminders():
    """取得所有應該發送的提醒（給 Make.com 使用）
    
    特性：
    - 最多回傳 3 筆提醒（防爆炸機制）
    - 依優先級排序（高 > 普通 > 低），再依時間排序
    - 超過 10 分鐘的提醒使用「補提醒」口吻
    - 根據 owner 設定目標接收者
    """
    tasks = load_tasks()
    now = datetime.now()
    current_date = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")
    current_datetime = now.strftime("%Y-%m-%d %H:%M")
    
    pending = []
    
    for task in tasks:
        reminders = task.get("reminders", [])
        task_owner = task.get("owner", "both")
        task_priority = task.get("priority", "normal")
        
        for i, reminder in enumerate(reminders):
            should_send = False
            r_time = ""
            r_full_datetime = ""
            reminder_id = ""
            
            if "datetime" in reminder:
                if reminder.get("sent"):
                    continue
                r_datetime = reminder.get("datetime", "")
                if r_datetime <= current_datetime:
                    should_send = True
                    r_time = r_datetime.split(" ")[1] if " " in r_datetime else ""
                    r_full_datetime = r_datetime
                    reminder_id = f"auto_{i}"
            else:
                if reminder.get("is_sent"):
                    continue
                
                r_type = reminder.get("reminder_type")
                r_time = reminder.get("reminder_time")
                reminder_id = reminder.get("reminder_id", f"legacy_{i}")
                
                if r_type == "once":
                    r_date = reminder.get("reminder_date")
                    if r_date == current_date and r_time <= current_time:
                        should_send = True
                        r_full_datetime = f"{r_date} {r_time}"
                
                elif r_type == "daily":
                    start_date = reminder.get("reminder_start_date")
                    end_date = reminder.get("reminder_end_date")
                    
                    if not (start_date <= current_date <= end_date):
                        continue
                    
                    if r_time > current_time:
                        continue
                    
                    if not reminder.get("sent_dates"):
                        reminder["sent_dates"] = []
                    
                    today_key = current_date
                    if today_key not in reminder["sent_dates"]:
                        should_send = True
                        r_full_datetime = f"{current_date} {r_time}"
                
                elif r_type == "days_later":
                    r_date = reminder.get("reminder_date")
                    if r_date == current_date and r_time <= current_time:
                        should_send = True
                        r_full_datetime = f"{r_date} {r_time}"
            
            if should_send:
                is_late = False
                if r_full_datetime:
                    try:
                        reminder_dt = datetime.strptime(r_full_datetime, "%Y-%m-%d %H:%M")
                        diff_minutes = (now - reminder_dt).total_seconds() / 60
                        is_late = diff_minutes > 10
                    except ValueError:
                        pass
                
                message = _build_reminder_message(
                    task.get("title"),
                    task_owner,
                    task_priority,
                    r_time,
                    is_late
                )
                
                target_user_ids = _get_target_user_ids(task_owner)
                
                pending.append({
                    "task_id": task.get("id"),
                    "task_title": task.get("title"),
                    "reminder_id": reminder_id,
                    "reminder_index": i,
                    "reminder_time": r_time,
                    "reminder_datetime": r_full_datetime,
                    "reminder_date": current_date,
                    "owner": task_owner,
                    "priority": task_priority,
                    "is_late": is_late,
                    "target_user_ids": target_user_ids,
                    "message": message
                })
    
    priority_order = {"high": 0, "normal": 1, "low": 2}
    pending.sort(key=lambda x: (priority_order.get(x["priority"], 1), x["reminder_datetime"]))
    
    return pending[:3]

def mark_reminder_sent(task_id, reminder_id, reminder_index=None):
    """標記提醒為已發送"""
    tasks = load_tasks()
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    for task in tasks:
        if task.get("id") == task_id:
            reminders = task.get("reminders", [])
            
            if reminder_index is not None and 0 <= reminder_index < len(reminders):
                reminder = reminders[reminder_index]
                if "datetime" in reminder:
                    reminder["sent"] = True
                else:
                    reminder["is_sent"] = True
            else:
                for reminder in reminders:
                    if reminder.get("reminder_id") == reminder_id:
                        if reminder.get("reminder_type") == "daily":
                            if "sent_dates" not in reminder:
                                reminder["sent_dates"] = []
                            today_key = current_date
                            if today_key not in reminder["sent_dates"]:
                                reminder["sent_dates"].append(today_key)
                            end_date = reminder.get("reminder_end_date")
                            if current_date >= end_date:
                                reminder["is_sent"] = True
                        else:
                            reminder["is_sent"] = True
                        break
            break
    
    save_tasks(tasks)

def handle_reminder_command(text):
    """處理提醒相關指令，若不是提醒指令則回傳 None"""
    
    if text.startswith("查詢提醒 "):
        task_name = text[5:].strip()
        if task_name:
            return query_reminders(task_name)
        return "請輸入任務名稱，例如：查詢提醒 看牙醫"
    
    if text.startswith("刪除提醒 "):
        content = text[5:].strip()
        match = re.match(r'^(.+?)\s+(\d+)$', content)
        if match:
            task_name = match.group(1).strip()
            reminder_index = int(match.group(2))
            return delete_reminder(task_name, reminder_index)
        return "請輸入：刪除提醒 任務名稱 提醒編號，例如：刪除提醒 看牙醫 1"
    
    if text.startswith("每日提醒 "):
        content = text[5:].strip()
        match = re.match(r'^(.+?)\s+(\d{1,2}:\d{2})\s+從\s+(\d{4}-\d{2}-\d{2})\s+到\s+(\d{4}-\d{2}-\d{2})$', content)
        if match:
            task_name = match.group(1).strip()
            reminder_time = match.group(2)
            start_date = match.group(3)
            end_date = match.group(4)
            return add_daily_reminder(task_name, reminder_time, start_date, end_date)
        return "請輸入：每日提醒 任務名稱 HH:MM 從 YYYY-MM-DD 到 YYYY-MM-DD\n例如：每日提醒 運動 07:00 從 2025-11-25 到 2025-12-02"
    
    days_later_match = re.match(r'^(\d+)天後提醒\s+(.+?)\s+(\d{1,2}:\d{2})$', text)
    if days_later_match:
        days = int(days_later_match.group(1))
        task_name = days_later_match.group(2).strip()
        reminder_time = days_later_match.group(3)
        return add_days_later_reminder(task_name, days, reminder_time)
    
    if text.startswith("提醒 "):
        content = text[3:].strip()
        match = re.match(r'^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$', content)
        if match:
            task_name = match.group(1).strip()
            reminder_date = match.group(2)
            reminder_time = match.group(3)
            return add_once_reminder(task_name, reminder_date, reminder_time)
        return "請輸入：提醒 任務名稱 YYYY-MM-DD HH:MM\n例如：提醒 看牙醫 2025-11-30 15:00"
    
    return None


# ==================== 快速查詢功能 ====================

def get_today_tomorrow_summary():
    """小結功能：回傳今天和明天的任務摘要"""
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    tasks = load_tasks()
    today_tasks = [t for t in tasks if t.get("date") == today]
    tomorrow_tasks = [t for t in tasks if t.get("date") == tomorrow]
    
    completed_today = [t for t in today_tasks if t.get("done")]
    incomplete_today = [t for t in today_tasks if not t.get("done")]
    
    lines = ["📊 任務小結\n"]
    
    lines.append(f"📅 今天 {today}")
    if completed_today:
        lines.append("\n✅ 已完成：")
        for t in completed_today:
            time_info = f" {t['time']}" if t.get("time") else ""
            priority_label = get_priority_label(t.get("priority", "normal"))
            reminder_count = get_pending_reminder_count(t)
            reminder_info = f" ({'⏰' * reminder_count})" if reminder_count > 0 else ""
            lines.append(f"  • {priority_label} {t['title']}{time_info}{reminder_info}")
    
    if incomplete_today:
        lines.append("\n⬜ 未完成：")
        for t in incomplete_today:
            time_info = f" {t['time']}" if t.get("time") else ""
            priority_label = get_priority_label(t.get("priority", "normal"))
            reminder_count = get_pending_reminder_count(t)
            reminder_info = f" ({'⏰' * reminder_count})" if reminder_count > 0 else ""
            lines.append(f"  • {priority_label} {t['title']}{time_info}{reminder_info}")
    
    if not today_tasks:
        lines.append("\n今天沒有待辦事項 🎉")
    
    if tomorrow_tasks:
        lines.append(f"\n\n📅 明天 {tomorrow}：")
        for t in tomorrow_tasks:
            time_info = f" {t['time']}" if t.get("time") else ""
            priority_label = get_priority_label(t.get("priority", "normal"))
            status = "✅" if t.get("done") else "⬜"
            reminder_count = get_pending_reminder_count(t)
            reminder_info = f" ({'⏰' * reminder_count})" if reminder_count > 0 else ""
            lines.append(f"  • {status} {priority_label} {t['title']}{time_info}{reminder_info}")
    else:
        lines.append("\n\n明天目前沒有待辦事項")
    
    return "\n".join(lines)

def list_tasks_for_range(start_date, end_date):
    """本週待辦功能：列出日期範圍內的任務"""
    tasks = load_tasks()
    range_tasks = [t for t in tasks if start_date <= t.get("date", "") <= end_date]
    
    if not range_tasks:
        return "本週目前沒有任何待辦 🎉"
    
    def sort_key(t):
        date = t.get("date", "")
        time = t.get("time", "") or "99:99"
        return (date, time)
    
    range_tasks.sort(key=sort_key)
    
    lines = ["📋 本週待辦：\n"]
    current_date = None
    
    for t in range_tasks:
        task_date = t.get("date")
        if task_date != current_date:
            current_date = task_date
            lines.append(f"\n📅 {task_date}")
        
        status = "✅" if t.get("done") else "⬜"
        time_info = f" {t['time']}" if t.get("time") else ""
        priority_label = get_priority_label(t.get("priority", "normal"))
        reminder_count = get_pending_reminder_count(t)
        reminder_info = f" ({'⏰' * reminder_count})" if reminder_count > 0 else ""
        lines.append(f"  • {status} {priority_label} {t['title']}{time_info}{reminder_info}")
    
    return "\n".join(lines)

def get_incomplete_by_owner():
    """誰還沒做功能：統計今天各 owner 的未完成任務數量"""
    today = datetime.now().strftime("%Y-%m-%d")
    tasks = load_tasks()
    today_tasks = [t for t in tasks if t.get("date") == today and not t.get("done")]
    
    a_count = len([t for t in today_tasks if t.get("owner", "both") == "A"])
    b_count = len([t for t in today_tasks if t.get("owner", "both") == "B"])
    both_count = len([t for t in today_tasks if t.get("owner", "both") == "both"])
    
    lines = ["📊 今天還沒做完的任務數量：\n"]
    lines.append(f"👤 世鈞：{a_count} 個")
    lines.append(f"👤 大人：{b_count} 個")
    lines.append(f"👥 共同任務：{both_count} 個")
    
    total = a_count + b_count + both_count
    if total == 0:
        lines.append("\n🎉 太棒了！今天的任務都完成了！")
    
    return "\n".join(lines)


# ==================== AI 整理成多筆待辦 ====================

def generate_tasks_from_text(raw_text):
    """使用 AI 將一段描述拆解成多筆待辦"""
    can_use, current_count, limit = check_and_increment_api_usage()
    
    if not can_use:
        return f"哎呀，最近 AI 查太兇了，這個月額度快用完囉～（{current_count}/{limit}）下個月再來用這功能吧！你可以先用一般的「待辦」指令手動新增 ✨"
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    system_prompt = """你是一個待辦清單助手。
使用者會給你一段中文描述，請你拆解成數個待辦任務。
只回傳一個 JSON 陣列，每個元素是只有 title 欄位的物件。
請勿回傳其他文字，只回傳純 JSON。

範例輸入：下週要去台中玩兩天，幫我列需要準備的東西。
範例輸出：[{"title": "整理行李"}, {"title": "準備換洗衣物"}, {"title": "確認住宿資訊"}, {"title": "規劃景點行程"}]"""
    
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "sonar-pro",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": raw_text}
        ],
        "temperature": 0.3,
        "stream": False
    }
    
    try:
        response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        ai_response = result["choices"][0]["message"]["content"].strip()
        
        json_match = re.search(r'\[.*\]', ai_response, re.DOTALL)
        if json_match:
            ai_response = json_match.group(0)
        
        task_list = json.loads(ai_response)
        
        if not isinstance(task_list, list) or len(task_list) == 0:
            return "AI 無法從你的描述中拆解出待辦事項，請換個說法試試看～"
        
        added_titles = []
        for item in task_list:
            title = item.get("title", "").strip()
            if title:
                add_task(title, today, "", "normal", "both")
                added_titles.append(title)
        
        if not added_titles:
            return "AI 無法從你的描述中拆解出待辦事項，請換個說法試試看～"
        
        lines = ["已幫你新增以下待辦：\n"]
        for i, title in enumerate(added_titles, 1):
            lines.append(f"{i}. {title}")
        
        return "\n".join(lines)
        
    except requests.exceptions.Timeout:
        return "AI 處理超時了，請稍後再試或使用一般待辦指令～"
    except json.JSONDecodeError:
        return "AI 回傳格式有誤，請稍後再試或使用一般待辦指令～"
    except Exception as e:
        logger.error(f"AI task generation error: {e}")
        return "AI 處理時發生錯誤，請稍後再試或使用一般待辦指令～"


def handle_task_command(text):
    """處理待辦相關指令，若不是待辦指令則回傳 None"""
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    if text in ("額度", "AI額度", "查額度", "額度查詢"):
        return get_api_usage_display()
    
    if text == "小結":
        return get_today_tomorrow_summary()
    
    if text in ("本週待辦", "本週"):
        end_date = (datetime.now() + timedelta(days=6)).strftime("%Y-%m-%d")
        return list_tasks_for_range(today, end_date)
    
    if text == "誰還沒做":
        return get_incomplete_by_owner()
    
    edgar_keywords = ("世鈞", "腦公", "Edgar")
    if any(k in text for k in edgar_keywords) and "待辦" in text:
        return list_tasks_for_date(today, "今天世鈞的", owner_filter="A")
    
    roy_keywords = ("潘大人", "大人哥", "大人", "Roy")
    if any(k in text for k in roy_keywords) and "待辦" in text:
        return list_tasks_for_date(today, "今天大人的", owner_filter="B")
    
    if text in ("情侶待辦", "今天情侶待辦", "共同待辦"):
        return list_tasks_for_date(today, "今天共同的", owner_filter="both")
    
    if text in ("今天待辦", "今日待辦"):
        return list_tasks_for_date(today, "今天")
    
    if text in ("明日待辦列表", "明天待辦"):
        return list_tasks_for_date(tomorrow, "明天")
    
    if text.startswith("完成 ") or text.startswith("完成"):
        match = re.search(r'(\d+)', text)
        if match:
            task_num = int(match.group(1))
            return complete_task(task_num, today)
        return "請輸入要完成的任務編號，例如：完成 1"
    
    if text.endswith("完成") and len(text) > 2:
        task_name = text[:-2].strip()
        if task_name:
            return complete_task_by_name(task_name, today)
    
    if text.startswith("刪除 "):
        content = text[3:].strip()
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})\s+(\d+)$', content)
        if date_match:
            date_str = date_match.group(1)
            task_num = int(date_match.group(2))
            return delete_task(task_num, date_str)
        num_match = re.match(r'^(\d+)$', content)
        if num_match:
            task_num = int(num_match.group(1))
            return delete_task(task_num, today)
        return "請輸入：刪除 1 或 刪除 2025-12-01 1"
    
    if text.startswith("改時間 "):
        content = text[4:].strip()
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})\s+(\d+)\s+(\d{1,2}:\d{2})$', content)
        if date_match:
            date_str = date_match.group(1)
            task_num = int(date_match.group(2))
            new_time = date_match.group(3)
            return modify_task_time(task_num, date_str, new_time)
        today_match = re.match(r'^(\d+)\s+(\d{1,2}:\d{2})$', content)
        if today_match:
            task_num = int(today_match.group(1))
            new_time = today_match.group(2)
            return modify_task_time(task_num, today, new_time)
        return "請輸入：改時間 1 14:00 或 改時間 2025-12-01 1 14:00"
    
    if text.startswith("改內容 "):
        content = text[4:].strip()
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})\s+(\d+)\s+(.+)$', content)
        if date_match:
            date_str = date_match.group(1)
            task_num = int(date_match.group(2))
            new_content = date_match.group(3).strip()
            return modify_task_content(task_num, date_str, new_content)
        today_match = re.match(r'^(\d+)\s+(.+)$', content)
        if today_match:
            task_num = int(today_match.group(1))
            new_content = today_match.group(2).strip()
            return modify_task_content(task_num, today, new_content)
        return "請輸入：改內容 1 新內容 或 改內容 2025-12-01 1 新內容"
    
    if text.startswith("待辦 ") or text.startswith("明日待辦 "):
        title, date_str, time_str, priority, owner = parse_task_command(text)
        if title and date_str:
            return add_task(title, date_str, time_str or "", priority or "normal", owner or "both")
        return "請輸入任務內容，例如：待辦 買牛奶 14:00"
    
    return None


def get_perplexity_response(user_id, user_message):
    can_use, current_count, limit = check_and_increment_api_usage()
    
    if not can_use:
        return f"哎呀，最近 AI 查太兇了，這個月額度快用完囉～（{current_count}/{limit}）下個月再來聊吧！待辦功能還是可以正常用喔 ✨"
    
    history = get_history_for_user(user_id)
    
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    messages = [{"role": "system", "content": HAODAI_SYSTEM_PROMPT}]
    messages.extend(FEW_SHOT_EXAMPLES)
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    
    payload = {
        "model": "sonar-pro",
        "messages": messages,
        "temperature": 0.8,
        "top_p": 0.9,
        "stream": False
    }
    
    try:
        response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        assistant_message = result["choices"][0]["message"]["content"]
        
        save_to_history(user_id, "user", user_message)
        save_to_history(user_id, "assistant", assistant_message)
        
        return assistant_message
    except requests.exceptions.Timeout:
        return "欸不好意思，我剛剛腦袋當機了一下，可以再說一次嗎？"
    except requests.exceptions.RequestException as e:
        logger.error(f"Perplexity API error: {e}")
        return "哎呀，我這邊好像有點問題，等一下再試試看好嗎～"
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return "不好意思欸，出了點小狀況，晚點再聊好嗎？"

@app.route("/")
def home():
    status = "running" if handler else "waiting for LINE credentials"
    domain = os.environ.get("REPLIT_DEV_DOMAIN", request.host)
    webhook_url = f"https://{domain}/callback"
    cron_url = f"https://{domain}/cron-daily-report"
    reminders_url = f"https://{domain}/reminders-check"
    return f"""
    <html>
    <head><title>LINE Bot - 浩呆 + 生活管家</title></head>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
        <h1>LINE Bot - 浩呆 + 生活管家</h1>
        <p>Status: <strong>{status}</strong></p>
        
        <h2>API Endpoints</h2>
        <h3>Webhook URL</h3>
        <p>Use this URL in your LINE Developers Console:</p>
        <code style="background: #f0f0f0; padding: 10px; display: block;">{webhook_url}</code>
        
        <h3>Daily Report Cron URL</h3>
        <p>Use this URL for external cron scheduler:</p>
        <code style="background: #f0f0f0; padding: 10px; display: block;">{cron_url}</code>
        
        <h3>Reminders Check URL (for Make.com)</h3>
        <p>Use this URL for reminder automation:</p>
        <code style="background: #f0f0f0; padding: 10px; display: block;">{reminders_url}</code>
        
        <h2>待辦指令</h2>
        <h3>新增任務</h3>
        <ul>
            <li><code>待辦 買牛奶</code> - 新增今天的待辦</li>
            <li><code>待辦 開會 14:00</code> - 新增今天的待辦（含時間）</li>
            <li><code>待辦 繳費 2025-12-01</code> - 新增指定日期的待辦</li>
            <li><code>待辦 繳費 2025-12-01 10:00</code> - 新增指定日期時間的待辦</li>
            <li><code>明日待辦 買早餐</code> - 新增明天的待辦</li>
            <li><code>明日待辦 買早餐 08:00</code> - 新增明天的待辦（含時間）</li>
        </ul>
        <h3>查詢任務</h3>
        <ul>
            <li><code>今天待辦</code> - 列出今天所有任務</li>
            <li><code>明日待辦列表</code> - 列出明天所有任務</li>
        </ul>
        <h3>完成、刪除、修改</h3>
        <ul>
            <li><code>完成 1</code> - 將今天第 1 筆任務標記為完成</li>
            <li><code>買牛奶完成</code> - 用任務名稱完成任務</li>
            <li><code>刪除 1</code> - 刪除今天第 1 筆任務</li>
            <li><code>刪除 2025-12-01 2</code> - 刪除指定日期第 2 筆任務</li>
            <li><code>改時間 1 14:00</code> - 修改今天第 1 筆任務的時間</li>
            <li><code>改時間 2025-12-01 1 09:00</code> - 修改指定日期任務的時間</li>
            <li><code>改內容 1 新的任務內容</code> - 修改今天第 1 筆任務的內容</li>
            <li><code>改內容 2025-12-01 1 新內容</code> - 修改指定日期任務的內容</li>
        </ul>
        
        <h2>提醒指令</h2>
        <h3>新增提醒</h3>
        <ul>
            <li><code>提醒 看牙醫 2025-11-30 15:00</code> - 單次提醒（指定日期時間）</li>
            <li><code>每日提醒 運動 07:00 從 2025-11-25 到 2025-12-02</code> - 每日提醒（連續多天）</li>
            <li><code>5天後提醒 買禮物 18:00</code> - N天後提醒</li>
        </ul>
        <h3>查詢、刪除提醒</h3>
        <ul>
            <li><code>查詢提醒 看牙醫</code> - 查詢任務的所有提醒</li>
            <li><code>刪除提醒 看牙醫 1</code> - 刪除任務的第 1 筆提醒</li>
        </ul>
        
        <h2>Setup Instructions</h2>
        <ol>
            <li>Go to <a href="https://developers.line.biz/" target="_blank">LINE Developers Console</a></li>
            <li>Create a new Messaging API channel</li>
            <li>Get your Channel Secret and Channel Access Token</li>
            <li>Set the Webhook URL to the URL shown above</li>
            <li>Enable "Use webhook" in your channel settings</li>
            <li>Set <code>REPORT_USER_ID</code> in Secrets for daily report push messages</li>
        </ol>
        
        <h2>Make.com Integration</h2>
        <p>Set up a Make.com scenario to call <code>/reminders-check</code> every minute for automated reminder push notifications.</p>
    </body>
    </html>
    """

@app.route("/callback", methods=["POST"])
def callback():
    """處理 LINE Webhook"""
    if not handler:
        return "LINE credentials not configured", 500
    
    from linebot.v3.exceptions import InvalidSignatureError
    
    signature = request.headers.get("X-Line-Signature", "")
    body = request.get_data(as_text=True)
    
    app.logger.info("Request body: " + body)
    
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        app.logger.error("Invalid signature. Check your channel secret.")
        abort(400)
    
    return "OK"


# ==================== 每日報表 /cron-daily-report ====================

@app.route("/cron-daily-report", methods=["GET"])
def cron_daily_report():
    """每日報表端點 - 由外部 cron 呼叫，發送今日/明日任務摘要"""
    if not REPORT_USER_ID:
        return "REPORT_USER_ID not configured", 400
    
    if not configuration:
        return "LINE credentials not configured", 500
    
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    tasks = load_tasks()
    today_tasks = [t for t in tasks if t.get("date") == today]
    tomorrow_tasks = [t for t in tasks if t.get("date") == tomorrow]
    
    completed_today = [t for t in today_tasks if t.get("done")]
    incomplete_today = [t for t in today_tasks if not t.get("done")]
    
    lines = ["📊 每日任務報告\n"]
    
    lines.append(f"📅 {today}")
    if completed_today:
        lines.append("\n✅ 今天完成的任務：")
        for t in completed_today:
            time_info = f" {t['time']}" if t.get("time") else ""
            priority_label = get_priority_label(t.get("priority", "normal"))
            lines.append(f"  • {priority_label} {t['title']}{time_info}")
    
    if incomplete_today:
        lines.append("\n⬜ 今天未完成的任務：")
        for t in incomplete_today:
            time_info = f" {t['time']}" if t.get("time") else ""
            priority_label = get_priority_label(t.get("priority", "normal"))
            lines.append(f"  • {priority_label} {t['title']}{time_info}")
    
    if not today_tasks:
        lines.append("\n今天沒有待辦事項 🎉")
    
    today_reminders = []
    for t in today_tasks:
        reminders = t.get("reminders", [])
        task_times = []
        for r in reminders:
            if "datetime" in r and r.get("datetime", "").startswith(today):
                time_part = r.get("datetime", "").split(" ")[1] if " " in r.get("datetime", "") else ""
                if time_part and not r.get("sent"):
                    task_times.append(time_part)
            elif "reminder_date" in r and r.get("reminder_date") == today:
                if not r.get("is_sent"):
                    task_times.append(r.get("reminder_time", ""))
        if task_times:
            today_reminders.append({"title": t.get("title"), "times": task_times})
    
    if today_reminders:
        lines.append("\n\n⏰ 今日提醒：")
        for item in today_reminders:
            times_str = ", ".join(item["times"])
            lines.append(f"  • {item['title']}：{times_str}")
    
    if tomorrow_tasks:
        lines.append(f"\n\n📅 明天 {tomorrow} 的任務：")
        for t in tomorrow_tasks:
            time_info = f" {t['time']}" if t.get("time") else ""
            priority_label = get_priority_label(t.get("priority", "normal"))
            lines.append(f"  • {priority_label} {t['title']}{time_info}")
    else:
        lines.append("\n\n明天目前沒有待辦事項")
    
    report_message = "\n".join(lines)
    
    try:
        from linebot.v3.messaging import ApiClient, MessagingApi, PushMessageRequest, TextMessage
        
        with ApiClient(configuration) as api_client:
            line_bot_api = MessagingApi(api_client)
            line_bot_api.push_message(
                PushMessageRequest(
                    to=REPORT_USER_ID,
                    messages=[TextMessage(text=report_message)]
                )
            )
        logger.info(f"Daily report sent to {REPORT_USER_ID[:8]}...")
        return "Report sent successfully", 200
    except Exception as e:
        logger.error(f"Failed to send daily report: {e}")
        return f"Failed to send report: {str(e)}", 500


# ==================== 提醒檢查 /reminders-check ====================

@app.route("/reminders-check", methods=["GET"])
def reminders_check():
    """提醒檢查端點 - 由 Make.com 每分鐘呼叫，回傳待發送的提醒"""
    pending = get_pending_reminders()
    
    return jsonify({
        "pending_count": len(pending),
        "pending_reminders": pending,
        "checked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route("/reminders-mark-sent", methods=["POST"])
def reminders_mark_sent():
    """標記提醒為已發送 - 由 Make.com 發送後呼叫"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    task_id = data.get("task_id")
    reminder_id = data.get("reminder_id")
    reminder_index = data.get("reminder_index")
    
    if not task_id:
        return jsonify({"error": "task_id required"}), 400
    
    if reminder_index is None and not reminder_id:
        return jsonify({"error": "reminder_id or reminder_index required"}), 400
    
    tasks = load_tasks()
    task_found = False
    
    for task in tasks:
        if task.get("id") == task_id:
            task_found = True
            break
    
    if not task_found:
        return jsonify({"error": f"Task {task_id} not found"}), 404
    
    mark_reminder_sent(task_id, reminder_id, reminder_index)
    
    return jsonify({
        "success": True,
        "message": f"Reminder marked as sent for task {task_id}"
    })


def register_handlers():
    """註冊 LINE Webhook 事件處理"""
    global handler, configuration
    
    if not handler:
        logger.warning("Cannot register handlers - LINE credentials not set yet")
        return False
    
    if not configuration:
        logger.warning("Cannot register handlers - LINE configuration not set yet")
        return False
    
    from linebot.v3.webhooks import MessageEvent, TextMessageContent
    from linebot.v3.messaging import ApiClient, MessagingApi, ReplyMessageRequest, TextMessage
    
    @handler.add(MessageEvent, message=TextMessageContent)
    def handle_message(event):
        user_id = event.source.user_id
        user_message = event.message.text.strip()
        
        if user_message == "我的ID":
            response = f"你的 userId 是：\n{user_id}"
            try:
                with ApiClient(configuration) as api_client:
                    line_bot_api = MessagingApi(api_client)
                    line_bot_api.reply_message_with_http_info(
                        ReplyMessageRequest(
                            reply_token=event.reply_token,
                            messages=[TextMessage(text=response)]
                        )
                    )
                logger.info(f"Replied userId to user: {user_id[:8]}...")
            except Exception as e:
                logger.error(f"Failed to send userId reply: {e}")
            return
        
        is_group = hasattr(event.source, 'group_id') or hasattr(event.source, 'room_id')
        
        if is_group:
            trigger_words = ['浩呆', '!浩呆', '/浩呆', '好呆', '呆呆']
            has_trigger = any(word in user_message for word in trigger_words)
            
            if not has_trigger:
                logger.info(f"Group message ignored - no trigger word: {user_message[:30]}...")
                return
            
            for word in trigger_words:
                user_message = user_message.replace(word, "").strip()
        
        logger.info(f"Processing message from {user_id[:8]}...: {user_message[:50]}...")
        
        if user_message.startswith("整理成待辦：") or user_message.startswith("整理成待辦:"):
            if user_message.startswith("整理成待辦："):
                raw_text = user_message[7:].strip()
            else:
                raw_text = user_message[6:].strip()
            response = generate_tasks_from_text(raw_text)
        else:
            reminder_response = handle_reminder_command(user_message)
            if reminder_response:
                response = reminder_response
            else:
                task_response = handle_task_command(user_message)
                if task_response:
                    response = task_response
                else:
                    response = get_perplexity_response(user_id, user_message)
        
        try:
            with ApiClient(configuration) as api_client:
                line_bot_api = MessagingApi(api_client)
                line_bot_api.reply_message_with_http_info(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text=response)]
                    )
                )
            logger.info("Reply sent successfully")
        except Exception as e:
            logger.error(f"Failed to send LINE reply: {e}")
    
    return True


if register_handlers():
    logger.info("All handlers registered successfully")
else:
    logger.warning("Handlers not registered - waiting for LINE credentials")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)