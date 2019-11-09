#!/usr/bin/env python3
import argparse
import os
import logging
import random
import textwrap
import sys
import time
import datetime

from Gui import guiMain
from Main import main, from_patch_file, cosmetic_patch
from Utils import is_bundled, close_console, check_version, VersionError, check_python_version, local_path
from Settings import get_settings_from_command_line_args
from Fill import ShuffleError
import json

class ArgumentDefaultsHelpFormatter(argparse.RawTextHelpFormatter):

    def _get_help_string(self, action):
        return textwrap.dedent(action.help)


def collect_data(generate):
    item_distribution = {}
    try:
        with open("dists.json") as dists:
            item_distribution = json.load(dists)
    except FileNotFoundError:
        pass
    i = 0
    while True:
        i += 1
        print("Generating rando", i)
        try:
            location_items = generate()
        except ShuffleError:
            continue
        for location in location_items[0].world.get_locations():
            if location not in location_items:
                location, item = str(location), "None"
            else:
                location, item = str(location), str(location.item)
            if location not in item_distribution:
                item_distribution[location] = {item: 1}
                continue
            if item not in item_distribution[location]:
                item_distribution[location][item] = 1
                continue
            item_distribution[location][item] += 1
        if i % 100 == 0:
            with open("dists.json", "w") as dists:
                json.dump(item_distribution, dists, indent=4, sort_keys=True)


def get_locations(generate):
    location_items = generate()
    pocket = location_items[0]
    world = pocket.world
    dungeons = world.dungeons
    dungion_regions = [r for d in dungeons for r in d.regions]
    regions = [r for r in world.regions if r not in dungion_regions]
    overworld_regions = [r for r in regions if r.scene is not None]
    regions = [r for r in regions if r not in overworld_regions]
    for r in regions:
        try:
            parent_region = r.entrances[0].parent_region.scene or r.exits[0].parent_region.scene
        except IndexError:
            r.scene = r.name
            continue
        if parent_region is None:
            if len(r.exits) > 1:
                parent_region = r.exits[1].parent_region.scene
            elif len(r.entrances) > 1:
                parent_region = r.entrances[1].parent_region.scene
            if parent_region is None:
                r.scene = r.name
                continue
        r.scene = parent_region
    for r in dungion_regions:
        r.scene = r.dungeon.name

    locations = {}
    for location in world.get_locations():
        locations[str(location)] = {"region": location.parent_region.name, "scene": location.parent_region.scene}

    return locations


def start():
    settings, gui, args_loglevel, no_log_file = get_settings_from_command_line_args()

    # set up logger
    loglevel = {'error': logging.ERROR, 'info': logging.INFO, 'warning': logging.WARNING, 'debug': logging.DEBUG}[args_loglevel]
    logging.basicConfig(format='%(message)s', level=loglevel)

    logger = logging.getLogger('')

    if not settings.check_version:
        try:
            version_error = check_version(settings.checked_version)
        except VersionError as e:
            logger.warning(str(e))
    print(settings)

    generate = main(settings)
    collect_data(generate)
    #locations = get_locations(generate)
    #with open("locations.json", "w") as locations_f:
    #    json.dump(locations, locations_f, indent=4, sort_keys=True)


if __name__ == '__main__':
    check_python_version()
    start()
