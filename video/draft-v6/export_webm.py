from pathlib import Path
import sys,subprocess
R=Path(__file__).resolve().parent;sys.path.insert(0,str(R.parent/'.tools/python'))
import imageio_ffmpeg
F=imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([F,'-v','error','-y','-i',str(R/'ValueRange-Draft-v6-EN-ZH.mp4'),'-vf','scale=1280:720','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6','-row-mt','1','-crf','30','-b:v','0','-c:a','libopus','-b:a','128k',str(R/'preview-compatible.webm')],check=True)
print('Compatible preview ready')
