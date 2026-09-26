import urllib.request, json

d = json.load(
    urllib.request.urlopen(
        "https://storage.googleapis.com/flyem-male-cns/rois/fullbrain-roi-v5/segment_properties/info"
    )
)
ids = d["inline"]["ids"]
vals = d["inline"]["properties"][0]["values"]

for lab in [
    "EB",
    "FB",
    "NO",
    "PB",
    "AL(L)",
    "AL(R)",
    "CA(L)",
    "CA(R)",
    "PED(L)",
    "PED(R)",
    "ME(L)",
    "ME(R)",
    "LO(L)",
    "LO(R)",
    "BU(L)",
    "BU(R)",
]:
    i = vals.index(lab)
    print(f"{lab:10} -> id {ids[i]}")

print("\nWRONG mapping (what we used):")
for sid in ["19", "22", "45", "46"]:
    i = ids.index(sid)
    print(f"id {sid} is actually {vals[i]}")

print("\nMB lobes:")
for sid, lab in zip(ids, vals):
    if any(
        lab.startswith(p)
        for p in ("a'L", "aL", "b'L", "bL", "gL", "CA(", "PED(")
    ):
        print(f"{lab:10} -> id {sid}")
