"""Open native Synthworld through the installed Computer's real launcher."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.STDOUT)

adb('logcat', '-c')
for attempt in range(30):
    adb('shell', 'uiautomator', 'dump', '/sdcard/synthworld-launch.xml')
    xml = adb('shell', 'cat', '/sdcard/synthworld-launch.xml')
    nodes = ET.fromstring(xml).iter('node')
    node = next((n for n in nodes if 'Synthworld' in (n.get('text', '') + n.get('content-desc', ''))), None)
    if node is not None:
        x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds', '')))
        adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
        break
    time.sleep(1)
else:
    raise RuntimeError('Native game launcher was not available on Computer Home')

for attempt in range(60):
    logs = adb('logcat', '-d', '-s', 'SynthworldNative:I', 'godot:*', 'Godot:*', 'AndroidRuntime:E', '*:S')
    if 'Unable to setup the Godot engine' in logs or 'FATAL EXCEPTION' in logs:
        print(logs[-16000:])
        raise RuntimeError('Native Godot startup failed')
    if 'SYNTHWORLD_ENGINE_STARTED=true' in logs and 'SYNTHWORLD_WORLD_READY=true' in logs:
        print('Android native engine and Synthworld world scene both started')
        adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
        break
    time.sleep(1)
else:
    print(logs[-16000:])
    raise RuntimeError('Native game did not reach its world scene')
