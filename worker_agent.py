#!/usr/bin/env python3
"""
MOTIVE AI Worker Agent v1.0
이 파일 하나만 아무 컴퓨터에 복사해서 실행하면 Commander와 자동 연동됩니다.
  python3 worker_agent.py
"""
import subprocess, sys, os

# === Auto-install dependencies ===
REQUIRED = {"httpx": "httpx", "PIL": "pillow"}
_missing = []
for mod, pkg in REQUIRED.items():
    try:
        __import__(mod)
    except ImportError:
        _missing.append(pkg)
if _missing:
    print(f"[설치] 필요 패키지: {', '.join(_missing)}")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q"] + _missing)

# === Imports ===
import httpx, json, platform, socket, uuid, time, threading, shutil
from pathlib import Path
from datetime import datetime

# Optional imports
try:
    from PIL import ImageGrab
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# === System Detection ===
def detect_specs() -> dict:
    specs = {
        "hostname": socket.gethostname(),
        "os": f"{platform.system()} {platform.release()}",
        "arch": platform.machine(),
        "cpu_cores": os.cpu_count() or 2,
        "ram_gb": _detect_ram(),
        "gpu_name": _detect_gpu(),
        "gpu_vram_gb": _detect_gpu_vram(),
        "disk_free_gb": round(shutil.disk_usage("/").free / (1024**3), 1),
        "python_version": platform.python_version(),
    }
    return specs

def _detect_ram():
    try:
        if platform.system() == "Darwin":
            out = subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True).strip()
            return round(int(out) / (1024**3), 1)
        elif platform.system() == "Linux":
            with open("/proc/meminfo") as f:
                for line in f:
                    if line.startswith("MemTotal"):
                        return round(int(line.split()[1]) / (1024**2), 1)
        elif platform.system() == "Windows":
            out = subprocess.check_output(["wmic", "computersystem", "get", "TotalPhysicalMemory"], text=True)
            for line in out.strip().split("\n"):
                line = line.strip()
                if line.isdigit():
                    return round(int(line) / (1024**3), 1)
    except Exception:
        pass
    return 4.0

def _detect_gpu():
    try:
        if platform.system() == "Darwin":
            out = subprocess.check_output(["system_profiler", "SPDisplaysDataType"], text=True, timeout=10)
            for line in out.split("\n"):
                if "Chipset Model" in line or "Chip" in line:
                    return line.split(":")[-1].strip()
        elif platform.system() == "Linux":
            try:
                out = subprocess.check_output(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], text=True, timeout=5)
                return out.strip().split("\n")[0]
            except Exception:
                pass
        elif platform.system() == "Windows":
            out = subprocess.check_output(["wmic", "path", "win32_VideoController", "get", "name"], text=True, timeout=5)
            lines = [l.strip() for l in out.strip().split("\n") if l.strip() and l.strip() != "Name"]
            if lines:
                return lines[0]
    except Exception:
        pass
    return "Unknown"

def _detect_gpu_vram():
    try:
        if platform.system() == "Darwin":
            out = subprocess.check_output(["system_profiler", "SPDisplaysDataType"], text=True, timeout=10)
            for line in out.split("\n"):
                if "VRAM" in line or "Memory" in line.split(":")[0] if ":" in line else "":
                    val = line.split(":")[-1].strip()
                    if "GB" in val:
                        return float(val.replace("GB", "").strip())
                    elif "MB" in val:
                        return round(float(val.replace("MB", "").strip()) / 1024, 1)
        elif platform.system() == "Linux":
            try:
                out = subprocess.check_output(["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"], text=True, timeout=5)
                return round(float(out.strip()) / 1024, 1)
            except Exception:
                pass
    except Exception:
        pass
    return 0

# === Worker Agent ===
class WorkerAgent:
    def __init__(self, commander_url: str):
        self.url = commander_url.rstrip("/")
        self.worker_id = f"w-{uuid.uuid4().hex[:6]}"
        self.specs = detect_specs()
        self.token = None
        self.tier = None
        self.personas = []
        self.running = True
        self.client = httpx.Client(timeout=30.0)
        self.busy = False

    def register(self) -> bool:
        try:
            resp = self.client.post(f"{self.url}/api/worker/register", json={
                "worker_id": self.worker_id,
                "specs": self.specs,
            })
            data = resp.json()
            if not data.get("ok"):
                print(f"[오류] 등록 실패: {data.get('error')}")
                return False
            self.token = data["token"]
            self.tier = data["tier"]
            self.personas = data["assigned_personas"]
            print(f"\n[등록 완료]")
            print(f"  티어: {self.tier}")
            print(f"  페르소나 {len(self.personas)}명:")
            for pid, info in data.get("persona_details", {}).items():
                print(f"    {info['icon']} {info['name']} ({info['role']})")
            return True
        except Exception as e:
            print(f"[오류] Commander 연결 실패: {e}")
            return False

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def heartbeat_loop(self):
        fail_count = 0
        while self.running:
            try:
                resp = self.client.post(f"{self.url}/api/worker/heartbeat",
                    json={"worker_id": self.worker_id, "status": "busy" if self.busy else "idle"},
                    headers=self._headers())
                data = resp.json()
                if data.get("token"):
                    self.token = data["token"]
                fail_count = 0
            except Exception as e:
                fail_count += 1
                if fail_count >= 3:
                    print(f"[재연결] 서버 끊김 감지. 최신 URL 확인 중...")
                    new_url = _check_cloud_url()
                    if new_url and new_url != self.url:
                        print(f"[재연결] 새 URL 발견: {new_url}")
                        self.url = new_url
                    if self.register():
                        fail_count = 0
                    else:
                        print(f"[재연결] 서버 아직 안 올라옴. 30초 후 재시도...")
            time.sleep(30)

    def poll_loop(self):
        while self.running:
            if self.busy:
                time.sleep(2)
                continue
            try:
                resp = self.client.get(f"{self.url}/api/worker/poll/{self.worker_id}", headers=self._headers())
                data = resp.json()
                if data.get("task"):
                    self.execute(data["task"])
            except httpx.ReadTimeout:
                pass
            except Exception as e:
                if "401" in str(e) or "인증" in str(e):
                    print("[토큰 만료] 재등록 시도...")
                    self.register()
                else:
                    print(f"[폴링 오류] {e}")
            time.sleep(5)

    def execute(self, task: dict):
        tid = task.get("task_id", "?")
        pid = task.get("persona_id", "?")
        cmd = task.get("command", "")[:80]
        print(f"\n[작업 수신] {pid}: {cmd}")
        self.busy = True
        # Report running
        try:
            self.client.post(f"{self.url}/api/worker/result",
                json={"worker_id": self.worker_id, "task_id": tid, "status": "running"},
                headers=self._headers())
        except Exception:
            pass
        # Execute action
        try:
            result = self._do_action(task)
            self.client.post(f"{self.url}/api/worker/result",
                json={"worker_id": self.worker_id, "task_id": tid, "status": "done",
                       "result": json.dumps(result, ensure_ascii=False, default=str)},
                headers=self._headers())
            print(f"[완료] {pid}: {tid}")
        except Exception as e:
            self.client.post(f"{self.url}/api/worker/result",
                json={"worker_id": self.worker_id, "task_id": tid, "status": "failed", "error": str(e)},
                headers=self._headers())
            print(f"[실패] {pid}: {e}")
        self.busy = False

    def _do_action(self, task: dict) -> dict:
        action = task.get("action")
        if action == "browser":
            return self._browser(task.get("url", ""), task.get("instructions", ""))
        elif action == "terminal":
            return self._terminal(task.get("shell_command", ""))
        elif action == "screenshot":
            return self._screenshot()
        elif action == "file_read":
            return {"content": Path(task["path"]).read_text()[:10000]}
        elif action == "file_write":
            Path(task["path"]).write_text(task["content"])
            return {"written": task["path"]}
        elif action == "file_list":
            return {"files": [str(p) for p in Path(task.get("path", ".")).iterdir()][:100]}
        else:
            return {"message": "작업 수신 완료 (AI 처리는 Commander에서)", "task": task.get("command", "")}

    def _browser(self, url, instructions):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "playwright"])
            subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
            from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, timeout=30000)
            title = page.title()
            text = page.inner_text("body")[:5000]
            browser.close()
        return {"url": url, "title": title, "text_preview": text}

    def _terminal(self, cmd):
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        return {"stdout": r.stdout[:5000], "stderr": r.stderr[:2000], "code": r.returncode}

    def _screenshot(self):
        if not HAS_PIL:
            return {"error": "PIL not available"}
        img = ImageGrab.grab()
        path = f"/tmp/motive_screenshot_{int(time.time())}.png"
        img.save(path)
        return {"path": path, "size": os.path.getsize(path)}

# === Auto-Discovery ===
def _get_local_ip():
    """내 로컬 IP 주소 얻기 (게이트웨이 방향)"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None

def _check_host(ip, port=3456, timeout=0.8):
    """특정 IP:port에 Commander가 있는지 빠르게 확인"""
    try:
        r = httpx.get(f"http://{ip}:{port}/api/commander/health", timeout=timeout)
        d = r.json()
        if d.get("ok") and d.get("status") == "running":
            return f"http://{ip}:{port}"
    except Exception:
        pass
    return None

def _check_cloud_url():
    """GitHub Pages에서 최신 릴레이 터널 URL 자동 확인"""
    try:
        r = httpx.get("https://motiveinno-jpg.github.io/motive-team/relay-url.txt", timeout=5)
        if r.status_code == 200:
            url = r.text.strip()
            if url.startswith("https://"):
                # 실제 연결 가능한지 확인
                h = httpx.get(f"{url}/health", timeout=5)
                d = h.json()
                if d.get("ok"):
                    return url
    except Exception:
        pass
    return None

def auto_discover(port=3456) -> str:
    """Commander 자동 탐색: 클라우드URL → 환경변수 → localhost → 서브넷 스캔"""
    # 0) GitHub Pages에서 최신 터널 URL 확인 (어디서든 연결 가능)
    print("  [탐색] 클라우드 URL 확인...", end=" ")
    cloud = _check_cloud_url()
    if cloud:
        print(f"발견! {cloud}")
        return cloud
    print("없음")

    # 1) 환경변수
    env_url = os.environ.get("COMMANDER_URL", "").strip()
    if env_url:
        print(f"  [환경변수] {env_url}")
        return env_url

    # 2) localhost
    print("  [탐색] localhost 확인...", end=" ")
    found = _check_host("127.0.0.1", port)
    if found:
        print("발견!")
        return found
    print("없음")

    # 3) 같은 네트워크 서브넷 스캔 (/24)
    my_ip = _get_local_ip()
    if not my_ip:
        print("  [탐색] 로컬 IP를 알 수 없습니다")
        return None

    subnet = ".".join(my_ip.split(".")[:3])
    print(f"  [탐색] 네트워크 스캔 {subnet}.1~254 (포트 {port})...")

    result = [None]
    lock = threading.Lock()

    def scan(ip):
        if result[0]:
            return
        url = _check_host(ip, port, timeout=1.0)
        if url:
            with lock:
                if not result[0]:
                    result[0] = url

    threads = []
    for i in range(1, 255):
        ip = f"{subnet}.{i}"
        if ip == my_ip:
            continue
        t = threading.Thread(target=scan, args=(ip,), daemon=True)
        threads.append(t)
        t.start()
        # 동시 50개씩
        if len(threads) >= 50:
            for t in threads:
                t.join(timeout=1.5)
            threads = []
            if result[0]:
                break

    # 남은 스레드 대기
    for t in threads:
        t.join(timeout=1.5)

    if result[0]:
        print(f"  [발견] {result[0]}")
    else:
        print("  [탐색] Commander를 찾을 수 없습니다")
    return result[0]


# === Main ===
def main():
    print("=" * 50)
    print("  MOTIVE AI Worker Agent v1.0")
    print("  실행만 하면 자동으로 연결됩니다")
    print("=" * 50)

    specs = detect_specs()
    print(f"\n  호스트: {specs['hostname']}")
    print(f"  OS: {specs['os']} ({specs['arch']})")
    print(f"  CPU: {specs['cpu_cores']}코어 · RAM: {specs['ram_gb']}GB")
    print(f"  GPU: {specs['gpu_name']} ({specs['gpu_vram_gb']}GB)")
    print(f"  디스크: {specs['disk_free_gb']}GB 여유\n")

    # 자동 탐색
    url = auto_discover()

    if not url:
        print("\n  Commander를 자동으로 찾지 못했습니다.")
        print("  아이맥이 같은 네트워크에 있는지 확인하세요.")
        print("  또는 환경변수로 직접 지정:")
        print("    COMMANDER_URL=http://아이맥IP:3456 python3 worker_agent.py")
        input("\n  Enter 키를 누르면 종료합니다...")
        return

    agent = WorkerAgent(url)
    print(f"\n[연결 중] {url}...")

    # 초기 등록 (실패하면 30초마다 재시도)
    while not agent.register():
        print("[대기] 서버 응답 없음. 30초 후 재시도...")
        time.sleep(30)

    # Start threads
    threading.Thread(target=agent.heartbeat_loop, daemon=True).start()
    threading.Thread(target=agent.poll_loop, daemon=True).start()

    print(f"\n[대기 중] Commander 작업을 기다리고 있습니다...")
    print("  (서버 재시작되면 자동 재연결됩니다)")
    print("  (Ctrl+C로 종료)\n")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        agent.running = False
        print("\n[종료] Worker Agent를 종료합니다.")

if __name__ == "__main__":
    main()
