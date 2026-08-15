import spacy
from spacy.training import Example
from spacy.tokens import DocBin


text = """
ACCOUNTANT

Summary

Financial Accountant specializing in financial planning, reporting and analysis within the Department of Defense.

Experience

Company Name
July 2011 to November 2012
Accountant

Company Name
April 2010 to June 2011
Resource Advisor

Company Name
July 2008 to April 2010
Staff Accountant

Education

Northern Maine Community College
Associate in Accounting

Husson College
Bachelor's degree in Accounting

Skills

Accounting
General Accounting
Accounts Payable
Program Management
"""


def find_entity(text, phrase, label, occurrence=1):
    start = -1

    for _ in range(occurrence):
        start = text.find(phrase, start + 1)

        if start == -1:
            raise ValueError(f"Could not find {phrase!r}")

    end = start + len(phrase)

    return start, end, label


entities = [
    find_entity(text, "ACCOUNTANT", "JOB_TITLE"),
    find_entity(text, "Financial Accountant", "JOB_TITLE"),
    find_entity(text, "Accountant", "JOB_TITLE", occurrence=2),
    find_entity(text, "Resource Advisor", "JOB_TITLE"),
    find_entity(text, "Staff Accountant", "JOB_TITLE"),

    find_entity(
        text,
        "Northern Maine Community College",
        "SCHOOL"
    ),

    find_entity(text, "Husson College", "SCHOOL"),

    find_entity(text, "Associate", "DEGREE"),
    find_entity(text, "Bachelor's degree", "DEGREE"),

    find_entity(text, "Accounting", "SKILL", occurrence=2),
    find_entity(text, "General Accounting", "SKILL"),
    find_entity(text, "Accounts Payable", "SKILL"),
    find_entity(text, "Program Management", "SKILL"),
]


nlp = spacy.blank("en")

doc = nlp.make_doc(text)

example = Example.from_dict(
    doc,
    {
        "entities": entities
    }
)


print("\nValidated entities:")

for entity in example.reference.ents:
    print(entity.label_, "->", repr(entity.text))


doc_bin = DocBin()

doc_bin.add(example.reference)

doc_bin.to_disk("train.spacy")


print("\nSaved training data to train.spacy")