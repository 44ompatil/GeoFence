"""Register an ESP32 and issue a device-only token for HTTPS telemetry."""

import argparse
import hashlib
import secrets
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-id", required=True, help="Firebase project ID")
    parser.add_argument("--device-id", required=True, help="Must match firmware DEVICE_ID")
    parser.add_argument("--uid", required=True, help="Firebase Auth UID that owns the pet")
    parser.add_argument("--pet-id", required=True, help="Existing pet document ID")
    args = parser.parse_args()

    if "/" in args.device_id or not args.device_id:
        parser.error("--device-id must be a non-empty Firestore document ID")

    try:
        import firebase_admin
        from firebase_admin import firestore
    except ImportError:
        print(
            "Install the provisioning dependencies with "
            "'python -m pip install -r requirement.txt'.",
            file=sys.stderr,
        )
        return 1

    firebase_admin.initialize_app(options={"projectId": args.project_id})
    db = firestore.client()
    pet_ref = (
        db.collection("users")
        .document(args.uid)
        .collection("pets")
        .document(args.pet_id)
    )
    pet = pet_ref.get()
    if not pet.exists:
        parser.error("The pet document does not exist.")
    if pet.get("deviceId") != args.device_id:
        parser.error(
            "The pet's paired deviceId does not match --device-id. "
            "Pair this tracker in the dashboard first."
        )

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    db.collection("devices").document(args.device_id).set(
        {
            "uid": args.uid,
            "petId": args.pet_id,
            "tokenHash": token_hash,
            "enabled": True,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    print("Device registered. Copy this token into hardware/include/Secrets.h:")
    print(token)
    print("This token is shown only once. Keep it private and do not commit it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
