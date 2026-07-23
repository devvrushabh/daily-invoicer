import os
import sys
import shutil
import subprocess

def run_command(cmd, cwd=None):
    print(f"\n[BUILD] Running: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"[ERROR] Command failed with exit code {res.returncode}: {cmd}")
        sys.exit(res.returncode)

def main():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root_dir)
    print(f"=== Daily Invoicer Windows .exe Automated Build System ===")
    print(f"Working Directory: {root_dir}")

    # 1. Build Vite web bundle
    run_command("npx vite build", cwd=root_dir)

    # 2. Copy dist to windows-app/app
    src_dist = os.path.join(root_dir, "dist")
    dst_app = os.path.join(root_dir, "windows-app", "app")

    if os.path.exists(dst_app):
        shutil.rmtree(dst_app)
    shutil.copytree(src_dist, dst_app)
    print(f"[OK] Synced web bundle to windows-app/app")

    # 3. Build Windows .exe package with electron-builder
    win_app_dir = os.path.join(root_dir, "windows-app")
    run_command("npx electron-builder --win nsis", cwd=win_app_dir)

    # 4. Copy generated setup executable to windows-installer folder
    generated_exe = os.path.join(win_app_dir, "dist-installer", "Daily_Invoicer_Setup_1.0.0.exe")
    installer_dir = os.path.join(root_dir, "windows-installer")
    os.makedirs(installer_dir, exist_ok=True)
    target_exe = os.path.join(installer_dir, "Daily_Invoicer_Setup.exe")

    if os.path.exists(generated_exe):
        shutil.copy(generated_exe, target_exe)
        size_mb = os.path.getsize(target_exe) / (1024 * 1024)
        print(f"\n=======================================================")
        print(f"✅ SUCCESS! New Windows .exe setup generated successfully!")
        print(f"📁 Output File: {target_exe}")
        print(f"📦 File Size  : {size_mb:.2f} MB")
        print(f"=======================================================\n")
    else:
        print(f"[WARNING] Output executable not found at {generated_exe}")

if __name__ == "__main__":
    main()
