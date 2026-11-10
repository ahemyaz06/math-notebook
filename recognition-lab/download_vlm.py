"""Download the pinned Qwen3-VL-8B-Instruct model and Windows Vulkan runner."""
import hashlib
from pathlib import Path
import stat
import urllib.request
import zipfile

from local_lock import FileLock

ROOT = Path(__file__).resolve().parent
BIN_DIR = ROOT / "bin" / "llama-vulkan"
MODEL_DIR = ROOT / "models" / "qwen3-vl-8b"

LLAMA_ZIP_URL = "https://github.com/ggml-org/llama.cpp/releases/download/b11669/llama-b11669-bin-win-vulkan-x64.zip"
LLAMA_ZIP = (32182350, "2c07574e7bde71321cb785282b20cc821e951132149eeceeea32ddebdbf0598e")
HF_BASE = "https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct-GGUF/resolve/f982a07559d4a2f6c8744d840bf6fccab30eea96"
MODEL_FILES = {
    "mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf":
        (752289728, "c6ba85508d82f42590e6eb77d5340369ab6fecf107a7561d809523d8aa5f3bfd"),
    "Qwen3VL-8B-Instruct-Q4_K_M.gguf":
        (5027784800, "67d1659bfe71b89d50b45a4ad1a9e5b997e5bb16ce5da66a6a6167abd569e9e2"),
}


def verified(path, size, sha256):
    if not path.is_file() or path.stat().st_size != size:
        return False
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest() == sha256


def download_file(url: str, dest: Path, size: int, sha256: str):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if verified(dest, size, sha256):
        print(f"[skip] {dest.name} already verified")
        return
    part = dest.with_suffix(dest.suffix + ".part")
    existing = part.stat().st_size if part.is_file() else 0
    if existing == size and verified(part, size, sha256):
        part.replace(dest)
        return
    if existing >= size:
        part.unlink()
        existing = 0

    headers = {"User-Agent": "RecognitionLab", "Accept-Encoding": "identity"}
    if existing:
        headers["Range"] = f"bytes={existing}-"
        print(f"[resume] {dest.name} from {existing / 1e6:.1f} MB")
    else:
        print(f"[download] {dest.name}")
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=120) as response:
        if response.status == 200:
            existing = 0
        elif (response.status != 206 or not existing or
              response.headers.get("Content-Range") != f"bytes {existing}-{size - 1}/{size}"):
            raise OSError(f"{dest.name}: unexpected download range")
        downloaded = existing
        last_pct = -10
        with part.open("ab" if existing else "wb") as file:
            while chunk := response.read(4 * 1024 * 1024):
                downloaded += len(chunk)
                if downloaded > size:
                    raise OSError(f"{dest.name}: download exceeds the published size")
                file.write(chunk)
                pct = downloaded * 100 // size
                if pct >= last_pct + 10:
                    last_pct = pct
                    print(f"  {dest.name}: {pct}%", flush=True)
    if downloaded != size:
        raise OSError(f"{dest.name}: incomplete download. Run setup again to resume.")
    if not verified(part, size, sha256):
        part.unlink()
        raise OSError(f"{dest.name}: SHA-256 mismatch. Run setup again to download a fresh copy.")
    part.replace(dest)
    print(f"[done] {dest.name} verified")


def extract_runner(archive, destination):
    with zipfile.ZipFile(archive) as zip_file:
        members = zip_file.infolist()
        # The publisher ships these Windows binaries flat. Validate the whole
        # archive before writing, then put the executable in place last.
        for member in members:
            name = member.filename
            if (not name or name in {".", ".."} or name.rstrip(" .") != name or
                    any(ch in name for ch in "/\\:") or
                    stat.S_ISLNK(member.external_attr >> 16) or (destination / name).is_symlink()):
                raise OSError(f"Unexpected runner archive entry: {name}")
        if "llama-server.exe" not in zip_file.namelist():
            raise OSError("The runner archive is missing llama-server.exe")
        zip_file.extractall(destination, sorted(members, key=lambda member: member.filename == "llama-server.exe"))


def main():
    with FileLock(ROOT / "models" / ".vlm-setup.lock"):
        install()


def install():
    BIN_DIR.mkdir(parents=True, exist_ok=True)
    if not (BIN_DIR / "llama-server.exe").exists():
        zip_path = BIN_DIR / "llama-vulkan.zip"
        download_file(LLAMA_ZIP_URL, zip_path, *LLAMA_ZIP)
        extract_runner(zip_path, BIN_DIR)
        zip_path.unlink()
        print("[done] Extracted llama.cpp Vulkan GPU binaries")
    else:
        print("[skip] Using the existing llama-server.exe")
    for name, metadata in MODEL_FILES.items():
        download_file(f"{HF_BASE}/{name}", MODEL_DIR / name, *metadata)
    print("All Qwen3-VL-8B-Instruct (Q4_K_M) VLM files are ready.")


if __name__ == "__main__":
    main()
