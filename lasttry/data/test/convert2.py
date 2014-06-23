import json


def extract_all_occurences(data):
    """Return a list of all nodes involved in coocurences."""
    occurrences = {}
    # populate the occurence dict with all the listed occurences*
    for occurrence in data['occurrences']:
        occurrences[occurrence['label']] = occurrence

    # add the unlisted occurences with an 'occurence' score of ''
    for occurrence in data['co-occurrences']:
        for cooccurrence in occurrence['quoted-with']:
            if not cooccurrence['label'] in occurrences:
                occurrences[cooccurrence['label']] = {
                    'label': cooccurrence['label'],
                    'occurrence': ''
                }
    return occurrences.values()


def node_index(nodes, target_label):
    """Return the index of the item in the nodes list which label is the
    target label.

    """
    return [i for i, node in enumerate(nodes)
            if node['label'] == target_label][0]


def trace_links(data, occurrences):
    """Establishes the list of links bewteen all data nodes."""
    links = []
    for cooccurrence in data['co-occurrences']:
        for quote in cooccurrence['quoted-with']:
            # ignore self-links
            if cooccurrence['label'] == quote['label']:
                continue
            link = {
                'source':  node_index(occurrences, cooccurrence['label']),
                'target': node_index(occurrences, quote['label']),
                'weight':  quote['occurrence'],
            }
            links.append(link)
            print u'%s --(%s)--> %s' % (
                cooccurrence['label'], link['weight'], quote['label'])
    return links


def main():
    data = json.load(open('data.json'))
    new_data = {}
    new_data['occurrences'] = extract_all_occurences(data)
    new_data['links'] = trace_links(data, new_data['occurrences'])
    with open('new_data.json', 'w') as out:
        json.dump(new_data, out, indent=2)

if __name__ == '__main__':
    main()
