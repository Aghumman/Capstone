from flask import Flask, request, jsonify
import requests


app = Flask(__name__)


PARSER_URL = "http://127.0.0.1:5000"


@app.after_request
def add_cors_headers(response):

    origin = request.headers.get("Origin")

    allowed_origins = {
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    }

    if origin in allowed_origins:

        response.headers[
            "Access-Control-Allow-Origin"
        ] = origin

        response.headers[
            "Access-Control-Allow-Headers"
        ] = "Content-Type"

        response.headers[
            "Access-Control-Allow-Methods"
        ] = "GET, POST, OPTIONS"

        response.headers[
            "Vary"
        ] = "Origin"

    return response


@app.route(
    "/health",
    methods=["GET", "OPTIONS"]
)
def health():

    if request.method == "OPTIONS":
        return "", 204

    try:

        response = requests.get(
            f"{PARSER_URL}/health",
            timeout=10
        )

        return jsonify(
            response.json()
        ), response.status_code

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


@app.route(
    "/parse-resume",
    methods=["POST", "OPTIONS"]
)
def parse_resume_proxy():

    if request.method == "OPTIONS":
        return "", 204


    if "file" not in request.files:

        return jsonify({
            "error": "No file uploaded"
        }), 400


    uploaded_file = request.files[
        "file"
    ]


    if uploaded_file.filename == "":

        return jsonify({
            "error": "No file selected"
        }), 400


    try:

        file_bytes = (
            uploaded_file.read()
        )


        response = requests.post(
            f"{PARSER_URL}/parse-resume",

            files={
                "file": (
                    uploaded_file.filename,
                    file_bytes,
                    uploaded_file.content_type
                )
            },

            timeout=180
        )


        try:

            data = response.json()

        except Exception:

            return jsonify({
                "error":
                    "The resume parser returned an invalid response."
            }), 502


        print(
            "PARSER STATUS:",
            response.status_code
        )

        print(
            "PARSER DATA:",
            data
        )


        return jsonify(
            data
        ), response.status_code


    except requests.exceptions.Timeout:

        return jsonify({
            "error":
                "Resume parsing took too long."
        }), 504


    except requests.exceptions.ConnectionError:

        return jsonify({
            "error":
                (
                    "Could not connect to the resume parser. "
                    "Make sure app.py is running on port 5000."
                )
        }), 502


    except Exception as error:

        print(
            "PROXY ERROR:",
            error
        )

        return jsonify({
            "error":
                str(error)
        }), 500


if __name__ == "__main__":

    print(
        "Resume proxy running on http://127.0.0.1:5001"
    )

    print(
        "Your original parser must remain running on port 5000."
    )

    app.run(
        host="127.0.0.1",
        port=5001,
        debug=True
    )