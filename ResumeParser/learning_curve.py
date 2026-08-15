import matplotlib.pyplot as plt

# Model 1 results from spaCy training output
steps = [
    0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800,
    2000, 2200, 2400, 2600, 2800, 3000, 3200, 3400, 3600, 3800
]

precision = [
    0.00, 34.58, 35.29, 36.39, 34.36, 35.22, 35.85, 35.38,
    35.78, 34.77, 35.56, 41.14, 33.75, 32.92, 38.12, 38.53,
    34.96, 36.93, 36.12, 37.48
]

recall = [
    0.00, 37.69, 33.50, 33.76, 38.07, 36.29, 36.80, 34.39,
    37.18, 35.91, 36.42, 37.44, 37.69, 37.44, 34.39, 32.61,
    34.52, 36.93, 36.68, 37.82
]

f1 = [
    0.00, 36.07, 34.38, 35.02, 36.12, 35.75, 36.32, 34.88,
    36.47, 35.33, 35.99, 39.20, 35.61, 35.04, 36.16, 35.33,
    34.74, 36.93, 36.40, 37.65
]

plt.figure(figsize=(10, 6))

plt.plot(steps, precision, marker="o", label="Precision")
plt.plot(steps, recall, marker="o", label="Recall")
plt.plot(steps, f1, marker="o", label="F1 Score")

plt.xlabel("Training Steps")
plt.ylabel("Score (%)")
plt.title("Model 1 NER Performance During Training")
plt.legend()
plt.grid(True)

plt.tight_layout()
plt.savefig("model1_learning_curve.png", dpi=300)
plt.show()