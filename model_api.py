from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    # support multiple formats
    if isinstance(data, dict) and "data" in data:
        records = data["data"]
    elif isinstance(data, list):
        records = data
    else:
        return jsonify({"error": "Invalid input"}), 400

    predictions = []

    for row in records:
        # simple biased logic (for demo)
        if row.get("gender") == "Male":
            predictions.append(1)
        else:
            predictions.append(0)

    return jsonify({"predictions": predictions})

if __name__ == "__main__":
    app.run(port=8000)