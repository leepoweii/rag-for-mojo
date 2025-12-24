"""
Helper script to upload FAISS database to Modal Volume

This script uploads your local FAISS database to Modal's persistent storage.
Run this once before deploying your application.

Usage:
    modal run upload_faiss_to_modal.py
"""
import modal
from pathlib import Path

app = modal.App("upload-faiss-db")

# Create the same volume that the main app uses
faiss_volume = modal.Volume.from_name("mojo-faiss-db", create_if_missing=True)

# Simple image for verification
image = modal.Image.debian_slim()


@app.function(
    image=image,
    volumes={"/data": faiss_volume},
)
def verify_upload():
    """
    Verify that the FAISS database was uploaded correctly.
    Lists all files in the volume.
    """
    from pathlib import Path

    volume_faiss_path = Path("/data")  # Files are at root of volume

    print("\n🔍 Verifying FAISS database in Modal Volume...")
    print(f"   Path: {volume_faiss_path}")

    if not volume_faiss_path.exists():
        print("❌ FAISS database directory not found in volume!")
        return False

    files = list(volume_faiss_path.glob("*"))
    print(f"\n📂 Found {len(files)} files in volume:")
    for file in files:
        size_mb = file.stat().st_size / (1024 * 1024)
        print(f"   - {file.name} ({size_mb:.2f} MB)")

    # Check for required files
    required_files = ["index.faiss", "index.pkl"]
    missing_files = [f for f in required_files if not (volume_faiss_path / f).exists()]

    if missing_files:
        print(f"\n⚠️  Warning: Missing required files: {', '.join(missing_files)}")
        return False

    print("\n✅ FAISS database verified successfully!")
    return True


@app.local_entrypoint()
def main():
    """
    Main entrypoint: Upload and verify the FAISS database.
    """
    print("=" * 60)
    print("🚀 FAISS Database Upload to Modal")
    print("=" * 60)

    # Local FAISS database path
    local_faiss_path = Path(__file__).parent / "app" / "faiss_db"

    print(f"\n📤 Uploading FAISS database to Modal Volume...")
    print(f"   Local source: {local_faiss_path}")
    print(f"   Remote destination: / (root of volume)")

    # Check if local FAISS db exists
    if not local_faiss_path.exists():
        raise FileNotFoundError(
            f"FAISS database not found at {local_faiss_path}. "
            "Make sure you have built the FAISS index first."
        )

    # List files to upload
    faiss_files = list(local_faiss_path.glob("*"))
    print(f"\n📂 Found {len(faiss_files)} files to upload:")
    for file in faiss_files:
        if file.is_file():
            size_mb = file.stat().st_size / (1024 * 1024)
            print(f"   - {file.name} ({size_mb:.2f} MB)")

    # Upload files using batch_upload
    # Upload individual files to the root of the volume (not in a subdirectory)
    print(f"\n⏳ Uploading files...")
    with faiss_volume.batch_upload() as batch:
        for file in faiss_files:
            if file.is_file():
                # Upload to root of volume: /index.faiss, /index.pkl
                batch.put_file(str(file), f"/{file.name}")

    print("✅ Upload complete!")

    # Verify the upload
    success = verify_upload.remote()

    print("\n" + "=" * 60)
    if success:
        print("✅ Upload verified! You can now deploy your app:")
        print("   modal deploy modal_app.py")
    else:
        print("❌ Upload verification failed. Please check the logs above.")
    print("=" * 60)
