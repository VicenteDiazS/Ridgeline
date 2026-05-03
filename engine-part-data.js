export const defaultEnginePartKey = "timingBelt";

export const enginePartDetails = {
  alternator: {
    title: "Alternator",
    category: "Accessory drive",
    location:
      "Front/timing-belt end of the transverse V6, high on the accessory face and driven by the serpentine belt.",
    role:
      "Generates charging current for the battery and electrical system while the engine is running.",
    service:
      "Listen for bearing whine, check pulley alignment, and confirm charging voltage before replacing it.",
    notes: [
      "The model places it on the timing/accessory end because the Honda diagram lists it with the front accessory drive.",
      "The belt, tensioner, alternator pulley, and electrical connector should be inspected together.",
      "Use the VIN for final ordering because emissions and model-year splits can change catalog fitment."
    ],
    numbers: [
      ["Honda OEM", "31100-5J6-A01", "Alternator assembly, Denso supplier listing."],
      ["Honda Reman", "06311-5J6-505RM", "Honda remanufactured alternator assembly."],
      ["Denso", "Cross by 31100-5J6-A01", "Use the Honda OE number in Denso catalog lookup."]
    ]
  },
  starter: {
    title: "Starter Motor",
    category: "Starting system",
    location:
      "Front/radiator side of the transmission bellhousing, below the intake area rather than on the timing belt face.",
    role:
      "Engages the ring gear/flexplate to crank the J35Y6 until the engine starts on its own.",
    service:
      "Confirm battery condition, ground straps, starter relay operation, and voltage drop before condemning the starter.",
    notes: [
      "The visible label points to the modeled bellhousing-side starter body, with the solenoid riding on the motor.",
      "The starter is not part of the timing belt accessory stack even though it is near the engine/transmission joint.",
      "Intermittent no-crank complaints should be tested hot and cold because contact wear can be temperature sensitive."
    ],
    numbers: [
      ["Honda OEM", "31200-RK1-A71", "Starter motor assembly, Denso."],
      ["Honda Reman", "06312-RK1-505RM", "Honda remanufactured starter option."],
      ["Denso", "428000-7020 / 280-0429", "Common Denso cross-reference; verify by VIN before purchase."]
    ]
  },
  compressor: {
    title: "A/C Compressor",
    category: "Accessory drive",
    location:
      "Low on the front/timing-belt accessory face, sharing the serpentine belt path with the alternator and tensioner.",
    role:
      "Compresses refrigerant for the cabin air-conditioning system and cycles under HVAC command.",
    service:
      "Recover refrigerant with proper equipment before service; inspect clutch operation, line seals, and refrigerant oil amount.",
    notes: [
      "The compressor is shown on the separated front-accessory model so it is easier to identify without overlapping the timing cover.",
      "Compressor failure can send debris into the condenser and expansion valve, so the whole A/C circuit matters.",
      "Noise diagnosis should separate pulley bearing noise from internal compressor noise."
    ],
    numbers: [
      ["Honda OEM", "38810-RLV-A02", "A/C compressor, superseding earlier RLV-A01 listings."],
      ["Denso", "Cross by 38810-RLV-A02", "Use the Honda OE number for catalog matching."],
      ["Honda Oil Guide", "38899-RLV-A01", "Honda compressor oil reference used in service literature."]
    ]
  },
  serpentine: {
    title: "Serpentine Belt",
    category: "Accessory drive",
    location:
      "External belt loop on the timing-side accessory face, wrapping the alternator, compressor, and automatic tensioner.",
    role:
      "Transfers crankshaft power to belt-driven accessories outside the timing belt cover.",
    service:
      "Inspect for rib cracking, glazing, edge wear, chirp, and contamination from oil or coolant leaks.",
    notes: [
      "This is separate from the internal timing belt; it can be replaced without opening the timing cover.",
      "A belt noise can come from the belt itself, the automatic tensioner, or a pulley bearing.",
      "Record belt replacement separately from timing belt service because the intervals are not the same."
    ],
    numbers: [
      ["Honda OEM", "31110-RLV-A02", "Alternator/serpentine belt, Mitsuboshi listing."],
      ["Gates", "Cross by 31110-RLV-A02", "Use vehicle catalog and OE number for the correct belt length."],
      ["Continental/Dayco", "Cross by 31110-RLV-A02", "Verify belt length and rib count before ordering."]
    ]
  },
  driveTensioner: {
    title: "Drive Belt Tensioner",
    category: "Accessory drive",
    location:
      "On the front accessory face, acting on the serpentine belt path near the alternator and compressor.",
    role:
      "Keeps the accessory belt loaded so it does not slip under alternator or compressor load.",
    service:
      "Watch the arm while running; excessive flutter, weak spring force, or a noisy pulley points to replacement.",
    notes: [
      "This is not the timing belt hydraulic/automatic tensioner inside the cover.",
      "A worn tensioner can mimic alternator or compressor noise.",
      "Check belt alignment after replacing any accessory or bracket."
    ],
    numbers: [
      ["Honda OEM", "31170-RLV-A02", "Accessory drive belt tensioner assembly."],
      ["SKP", "SK36227", "Aftermarket pulley listing; verify if replacing pulley only."],
      ["Gates/Dayco", "Cross by 31170-RLV-A02", "Use current vehicle catalog for assembly or pulley options."]
    ]
  },
  throttleBody: {
    title: "Throttle Body",
    category: "Intake",
    location:
      "At the air inlet end of the upper intake path, where the intake tube feeds the manifold.",
    role:
      "Controls incoming airflow electronically for idle, acceleration, and traction/engine management.",
    service:
      "Clean only with throttle-body-safe cleaner and avoid forcing the electronic plate by hand.",
    notes: [
      "A dirty throttle bore can cause idle flare, stumble, or relearn complaints after battery disconnect.",
      "Use a new throttle-body gasket if the unit is removed.",
      "A scan tool can confirm commanded angle, actual angle, and relearn status."
    ],
    numbers: [
      ["Honda OEM", "16400-5J6-A01", "Electronic throttle body assembly."],
      ["Honda gasket", "17102-RLV-A01", "Throttle body gasket used with the intake manifold."],
      ["Standard/Hitachi", "Cross by 16400-5J6-A01", "Aftermarket fitment should be checked by VIN."]
    ]
  },
  airIntakeTube: {
    title: "Air Intake Tube",
    category: "Intake",
    location:
      "Between the air cleaner box and throttle body on the intake side of the engine.",
    role:
      "Carries filtered air into the throttle body while absorbing engine movement with a flexible tube section.",
    service:
      "Inspect for splits, loose clamps, and unmetered air leaks after the air filter box.",
    notes: [
      "Cracks around accordion sections can create lean or idle issues.",
      "Clamp orientation matters so the tube does not rub harnesses or brackets.",
      "Replace the air filter if the intake tube was opened during dusty work."
    ],
    numbers: [
      ["Honda OEM", "17228-5J6-A10", "Air flow tube."],
      ["Honda clamp", "17316-5J6-A01", "Air flow tube clamp."],
      ["Honda filter", "17220-5J6-A10", "Air cleaner element nearby in the same system."]
    ]
  },
  diFuelPump: {
    title: "High-Pressure Fuel Pump",
    category: "Fuel system",
    location:
      "Mounted high on the engine and driven mechanically to feed the direct-injection rails.",
    role:
      "Raises fuel pressure far above low-side pump pressure for direct injection into each cylinder.",
    service:
      "Relieve fuel pressure and follow Honda fuel-line replacement rules; high-pressure fuel work is not casual maintenance.",
    notes: [
      "A rhythmic ticking from this pump can be normal on direct-injection Hondas.",
      "Fuel smell, pressure codes, or hard starts require diagnosis before replacement.",
      "Honda service information often calls the connected high-pressure line a one-time-use part."
    ],
    numbers: [
      ["Honda OEM", "16790-RLV-305", "High-pressure fuel pump assembly."],
      ["Honda service kit", "06161-RLV-305", "Service kit replacing earlier pump listings."],
      ["Honda fuel pipe", "16012-R9P-315", "Fuel joint pipe set commonly serviced with pump/injector work."]
    ]
  },
  fuelRails: {
    title: "Fuel Rails / Fuel Joint Pipe",
    category: "Fuel system",
    location:
      "Along the intake valley, feeding the direct injectors on both cylinder banks.",
    role:
      "Distributes high-pressure fuel from the pump to the injector set.",
    service:
      "Treat the lines as high-pressure components and follow replacement/reuse rules from service information.",
    notes: [
      "The 3D model simplifies the twin-bank rail routing so the relationship to the injectors is visible.",
      "Leak inspection should be done with the engine off and under proper safety procedure.",
      "Do not reuse sealing parts if the service manual calls for replacement."
    ],
    numbers: [
      ["Honda OEM", "16012-R9P-315", "Fuel joint pipe set / high-pressure line."],
      ["Honda superseded", "16012-R9P-305", "Earlier listing replaced by 16012-R9P-315."],
      ["Aftermarket", "Use OE 16012-R9P-315", "Most reliable lookup is by OE number and VIN."]
    ]
  },
  fuelInjectors: {
    title: "Fuel Injectors",
    category: "Fuel system",
    location:
      "Direct injectors seated at the cylinder heads, below the rail area on each bank.",
    role:
      "Spray metered fuel directly into each combustion chamber under high pressure.",
    service:
      "Misfire, fuel trim, and injector balance data should be checked before replacing the set.",
    notes: [
      "2017-2019 Ridgeline/Pilot direct-injection systems are known service areas, so documentation matters.",
      "Injector seals and joint pipes are often service-critical when injectors are removed.",
      "Use only gasoline-rated direct-injection parts for the exact application."
    ],
    numbers: [
      ["Honda OEM", "16010-RLV-315", "Fuel injector set for 2017-2019 Ridgeline listings."],
      ["Honda superseded", "16010-RLV-305", "Earlier injector set reference."],
      ["Standard/GB/Hitachi", "Cross by 16010-RLV-315", "Verify by VIN and emissions before purchase."]
    ]
  },
  mapSensor: {
    title: "MAP Sensor",
    category: "Intake",
    location:
      "On the intake manifold/plenum, reading manifold pressure near the top of the engine.",
    role:
      "Reports manifold absolute pressure to the PCM for load calculation, fueling, and diagnostics.",
    service:
      "Inspect connector pins and vacuum/o-ring sealing before replacing a sensor for pressure codes.",
    notes: [
      "A MAP fault can be caused by wiring, a sealing leak, or intake restriction, not only the sensor.",
      "Keep sensor passages clean and dry.",
      "Use live data to compare key-on atmospheric pressure before diagnosis."
    ],
    numbers: [
      ["Honda OEM", "37830-RNA-A01", "MAP sensor assembly listed for Ridgeline applications."],
      ["Honda o-ring", "37835-PGK-A01", "MAP sensor o-ring reference in Honda service bulletins."],
      ["Standard/Denso", "Cross by 37830-RNA-A01", "Use current catalog by VIN."]
    ]
  },
  intakeManifold: {
    title: "Intake Manifold",
    category: "Intake",
    location:
      "Upper center of the V6, bridging the cylinder banks and feeding the six intake runners.",
    role:
      "Distributes metered air from the throttle body to the intake ports on both banks.",
    service:
      "Replace disturbed gaskets and check for vacuum leaks after removal.",
    notes: [
      "The model emphasizes runner layout and plenum position rather than exact casting texture.",
      "Manifold removal often overlaps with fuel injector, high-pressure pump, and rear-bank access.",
      "Bolt torque and sequence should come from Honda service information."
    ],
    numbers: [
      ["Honda OEM", "17160-RLV-A00", "Intake manifold/chamber reference from Honda diagram listings."],
      ["Honda gasket", "17101-RLV-A01", "Intake manifold gasket."],
      ["Honda gasket", "17102-RLV-A01", "Throttle body gasket."]
    ]
  },
  ignitionCoils: {
    title: "Ignition Coils",
    category: "Ignition",
    location:
      "On top of the front and rear cylinder head covers, one coil over each spark plug tube.",
    role:
      "Converts low-voltage control signals into high voltage for each spark plug.",
    service:
      "Swap-test only when appropriate and inspect plug condition, boot tracking, and oil in plug tubes.",
    notes: [
      "A coil code can be caused by a worn spark plug or oil-contaminated boot.",
      "Label coils by cylinder when diagnosing intermittent misfires.",
      "Use dielectric grease only where the coil boot procedure allows it."
    ],
    numbers: [
      ["Honda OEM", "30520-5G0-A01", "Ignition coil listing for 3.5L Ridgeline/Pilot applications."],
      ["Denso/Hitachi", "Cross by 30520-5G0-A01", "Confirm by VIN and connector shape."],
      ["NGK", "Cross by OE number", "Use current NGK catalog for exact coil reference."]
    ]
  },
  frontHeadCover: {
    title: "Front Cylinder Head Cover",
    category: "Top end",
    location:
      "Front/radiator-side bank cylinder head cover, visible with the coils and oil filler area.",
    role:
      "Seals the valve train, plug tubes, and crankcase ventilation area on the front cylinder bank.",
    service:
      "Replace the head-cover gasket set if seepage appears around the perimeter or spark plug tubes.",
    notes: [
      "The user-supplied valve cover reference was used for the general shape and bolt pattern idea.",
      "Oil in plug wells can cause misfire and coil boot tracking.",
      "Use Honda torque sequence and small fastener torque values to avoid cracking or leaks."
    ],
    numbers: [
      ["Honda cover", "12310-5J6-A00", "Front cylinder head cover assembly."],
      ["Honda gasket set", "12030-5G0-000", "Front head cover gasket set."],
      ["Honda washer", "12345-5G0-A01", "Sealing washer listed with head cover parts."]
    ]
  },
  rearHeadCover: {
    title: "Rear Cylinder Head Cover",
    category: "Top end",
    location:
      "Rear/firewall-side bank cylinder head cover, partly hidden behind the intake manifold in the vehicle.",
    role:
      "Seals the rear bank valve train and plug-tube area.",
    service:
      "Rear-bank access can require more intake-side disassembly than the front bank.",
    notes: [
      "Leaks on the rear bank can be harder to see because oil runs down the firewall side of the engine.",
      "Inspect coils, plug wells, PCV routing, and harness clips during cover service.",
      "Use new gaskets and torque in the service-manual pattern."
    ],
    numbers: [
      ["Honda cover", "12320-5J6-A00", "Rear cylinder head cover assembly."],
      ["Honda gasket set", "12050-5G0-000", "Rear head cover gasket set; verify by VIN."],
      ["Honda o-ring", "91307-RCA-A01", "O-ring reference in head cover diagrams."]
    ]
  },
  timingBelt: {
    title: "Timing Belt",
    category: "Timing service",
    location:
      "Inside the timing cover on the front/timing-belt end, wrapping the crank sprocket, cam pulleys, idler, tensioner, and water pump.",
    role:
      "Synchronizes crankshaft and camshaft rotation on the SOHC J-series V6.",
    service:
      "Your truck's timing belt service was recorded on April 25, 2026 at 165,980 miles with an AISIN TKH-002 kit from RockAuto.com.",
    notes: [
      "This is a critical interference-engine service item; a failed belt can cause major internal damage.",
      "The recorded service also replaced the crankshaft sprocket, tensioner, pulleys, timing cover seals, and water pump.",
      "Do not confuse this internal belt with the external serpentine accessory belt."
    ],
    numbers: [
      ["Honda OEM", "14400-R9P-A01", "Timing belt, Unitta listing."],
      ["AISIN", "TKH-002", "Timing belt replacement kit with water pump, user-recorded RockAuto purchase."],
      ["Gates/Dayco", "Cross by 14400-R9P-A01", "Use current catalog for complete kit and component fitment."]
    ]
  },
  camPulleys: {
    title: "Cam Pulleys CA1/CA2",
    category: "Timing service",
    location:
      "Upper left and upper right points of the timing belt path, one for each cylinder bank camshaft.",
    role:
      "Transfer timing belt motion to the camshafts so valve timing stays synchronized with the crankshaft.",
    service:
      "Alignment marks must be verified during belt installation; do not rotate components out of sequence.",
    notes: [
      "The supplied timing reference image labels the two upper cam pulley positions as CA1 and CA2.",
      "The 3D labels show both pulleys together because they work as a timed pair.",
      "Replacement is less common than belt, idler, tensioner, and water pump service, so verify the exact part by VIN."
    ],
    numbers: [
      ["Honda OEM", "14260-R70-A01", "Front timing belt driven pulley reference."],
      ["Honda diagram", "Camshaft timing belt group", "Use the bank-specific callout before ordering."],
      ["Aftermarket", "Cross by OE pulley number", "Use exact bank and application data."]
    ]
  },
  waterPump: {
    title: "Water Pump",
    category: "Timing service",
    location:
      "Inside the timing belt path near the center of the front timing cover area.",
    role:
      "Circulates coolant through the engine and is driven by the timing belt on this V6 layout.",
    service:
      "The water pump was replaced during the April 25, 2026 timing service at 165,980 miles.",
    notes: [
      "Replacing the pump during timing belt service avoids paying for the same timing access twice.",
      "Always inspect coolant condition, pump weep hole, and gasket sealing area.",
      "Use the correct coolant and bleed procedure after service."
    ],
    numbers: [
      ["Honda OEM", "19200-RDV-J01", "Water pump assembly, Yamada listing."],
      ["Honda gasket", "19222-P8A-A01", "Water pump gasket."],
      ["AISIN", "TKH-002 kit component", "Kit includes water pump for the timing service set."]
    ]
  },
  timingBeltTensioner: {
    title: "Timing Belt Tensioner",
    category: "Timing service",
    location:
      "Inside the timing cover, acting on the timing belt near the lower belt run.",
    role:
      "Controls timing belt tension so the belt does not jump teeth or slap under load changes.",
    service:
      "The timing belt tensioner was replaced with the recorded AISIN TKH-002 timing service.",
    notes: [
      "This is separate from the external accessory drive belt tensioner.",
      "A weak or leaking hydraulic/automatic tensioner can create belt slap or timing noise.",
      "Follow Honda pin-pull and preload procedure during installation."
    ],
    numbers: [
      ["Honda adjuster", "14510-R9P-A01", "Timing belt adjuster listing."],
      ["Honda auto tensioner", "14520-RCA-A01", "Automatic timing belt tensioner listing."],
      ["AISIN", "TKH-002 kit component", "Included in the user's recorded timing service kit."]
    ]
  },
  timingIdler: {
    title: "Timing Belt Idler",
    category: "Timing service",
    location:
      "Inside the timing cover, guiding the belt between the crank, cam pulleys, tensioner, and water pump.",
    role:
      "Keeps the timing belt path stable and aligned across the front of the engine.",
    service:
      "The timing belt pulleys/idlers were replaced during the April 25, 2026 timing service.",
    notes: [
      "A rough idler bearing can create whine and can damage a new belt.",
      "Some service information calls for related idler bolts or shims; verify the complete parts list.",
      "Spin-test by hand only with the belt removed and engine secured."
    ],
    numbers: [
      ["Honda OEM", "14550-RCA-A01", "Timing belt idler pulley."],
      ["Honda bolt", "14551-RCA-A01", "Timing belt idler bolt reference in service bulletins."],
      ["AISIN", "TKH-002 kit component", "Included with the user's timing belt kit."]
    ]
  },
  crankSprocket: {
    title: "Crankshaft Sprocket",
    category: "Timing service",
    location:
      "Lowest timing belt drive gear on the crankshaft, behind the crank pulley/harmonic balancer area.",
    role:
      "Drives the timing belt from the crankshaft and establishes the base timing relationship.",
    service:
      "The crankshaft sprocket was replaced during the recorded April 25, 2026 timing service.",
    notes: [
      "Crank keyway orientation and timing marks matter during installation.",
      "The outer crank pulley and timing belt drive gear are different parts.",
      "Confirm the exact drive pulley by VIN and engine number because catalog splits exist."
    ],
    numbers: [
      ["Honda OEM", "13621-5G0-A01", "Timing belt drive pulley for 2017+ Ridgeline listings."],
      ["Honda alternate", "13621-RV0-A01", "Earlier/split crank gear listing; verify by VIN and engine number."],
      ["Aftermarket", "Cross by OE number", "Use the exact OE number for crank sprocket matching."]
    ]
  },
  oilFillerCap: {
    title: "Oil Filler Cap",
    category: "Service item",
    location:
      "On the front cylinder head cover, at the top of the engine for engine oil filling.",
    role:
      "Seals the oil fill opening while allowing easy service access.",
    service:
      "Inspect the cap gasket and surrounding cover for seepage after oil changes.",
    notes: [
      "A loose cap can create oil mist and crankcase odor.",
      "Use the cap to confirm oil viscosity labeling only if the cap is original.",
      "Clean spilled oil from the head cover so future leaks are easier to spot."
    ],
    numbers: [
      ["Honda cap", "15610-R70-A00", "Common Honda oil filler cap family; verify by VIN."],
      ["Honda gasket", "15613-PC6-000", "Oil filler cap gasket listed with head cover parts."],
      ["Aftermarket", "Cross by cap/gasket OE number", "Many caps fit multiple Honda engines, but verify seal style."]
    ]
  },
  oilFilter: {
    title: "Oil Filter",
    category: "Service item",
    location:
      "Low on the front side of the engine block area, near the accessory/timing side in this service model.",
    role:
      "Filters engine oil before it circulates through bearings, cam journals, and hydraulic components.",
    service:
      "Change with oil, confirm the old gasket came off, lubricate the new gasket, and check for leaks after startup.",
    notes: [
      "The filter should be accessible from below on the real vehicle; use proper lifting points.",
      "Do not overtighten spin-on filters.",
      "Record oil viscosity, mileage, and filter used in the maintenance log."
    ],
    numbers: [
      ["Honda OEM", "15400-PLM-A02", "Common Honda spin-on oil filter reference."],
      ["WIX", "57356 / 57356XP", "Aftermarket oil filter listing for 2017 Ridgeline 3.5L."],
      ["FRAM", "PH7317 / TG7317 / XG7317", "Common FRAM cross-reference family."]
    ]
  },
  dipstick: {
    title: "Engine Oil Dipstick",
    category: "Service item",
    location:
      "Front/top service area with the handle visible above the front bank.",
    role:
      "Lets the owner manually verify engine oil level and condition.",
    service:
      "Check on level ground after oil drainback, wipe once, reinsert fully, then read the level.",
    notes: [
      "A low reading after service can indicate underfill, leak, or not waiting for drainback.",
      "Oil smell, glitter, milkiness, or severe darkening should be noted in the service record.",
      "The dipstick tube seal should be checked if oil appears around the tube base."
    ],
    numbers: [
      ["Honda dipstick", "15650-5J6-C00", "Engine oil level gauge for 2017 Ridgeline listings."],
      ["Honda alternate", "15650-RCA-A02", "Related J-series oil dipstick listing; verify by VIN."],
      ["Aftermarket", "Use OE gauge number", "Length and handle shape must match exactly."]
    ]
  },
  engineMounts: {
    title: "Engine Mounts",
    category: "Mounting",
    location:
      "Front and rear mount references around the lower engine cradle and transmission support points.",
    role:
      "Hold the powertrain in position while isolating vibration and controlling torque movement.",
    service:
      "Inspect for torn rubber, fluid leakage on active mounts, clunks on gear engagement, and excessive engine movement.",
    notes: [
      "Second-generation Ridgeline uses Active Control Engine Mounting on applicable trims/markets.",
      "The model shows simplified brackets so the mount locations are readable beside the engine.",
      "Use VIN lookup because mount part numbers differ by position, drivetrain, and transmission."
    ],
    numbers: [
      ["Honda rear mount", "50810-TZ5-A03", "Rear engine mounting assembly, ACM listing."],
      ["Honda front mount", "50820-TZ5-A02", "Front engine mounting reference."],
      ["Honda rear bracket", "50850-STX-A05", "Rear mount bracket/reference listing."]
    ]
  },
  egrPipe: {
    title: "EGR Pipe",
    category: "Emissions",
    location:
      "Rear/intake-side emissions tube routing exhaust gas back toward the intake stream.",
    role:
      "Routes metered exhaust gas for emissions control under commanded operating conditions.",
    service:
      "Inspect for exhaust leaks, gasket sealing, carbon buildup, and damaged heat shielding.",
    notes: [
      "EGR faults can be caused by valve, pipe, gasket, wiring, or carbon restriction issues.",
      "Use new gaskets if the pipe is removed.",
      "The 3D routing is simplified to show the system relationship."
    ],
    numbers: [
      ["Honda pipe", "17181-RLV-A00", "EGR pipe listing for 2017+ Ridgeline."],
      ["Honda valve", "18011-R1A-A00", "EGR valve set shown in Honda water pump/emissions diagrams."],
      ["Honda gasket", "18716-R70-A01", "EGR pipe gasket reference from Honda service parts."]
    ]
  },
  primaryCatalyst: {
    title: "Primary Catalyst",
    category: "Emissions",
    location:
      "Close-coupled converter area near the exhaust outlet from the cylinder head/manifold side.",
    role:
      "Reduces hydrocarbons, carbon monoxide, and oxides of nitrogen in the exhaust stream.",
    service:
      "Catalyst diagnosis should confirm misfire, fuel trim, oxygen sensor, and exhaust leak conditions before replacement.",
    notes: [
      "Catalysts are emissions-regulated parts; CARB and federal fitment can differ.",
      "A failed catalyst may be a result of upstream misfire, rich running, or oil/coolant contamination.",
      "The model uses simplified converter shells to show front/rear converter locations."
    ],
    numbers: [
      ["Honda front primary", "18180-5MJ-A00", "Integrated front primary converter/manifold assembly."],
      ["Honda converter/pipe", "18150-5MJ-A50", "Converter assembly listing for 2017+ Ridgeline."],
      ["Aftermarket", "Use VIN and emissions label", "CARB/federal legality must be checked before purchase."]
    ]
  },
  o2Sensors: {
    title: "O2 / A/F Sensors",
    category: "Emissions",
    location:
      "Threaded into the exhaust stream around the primary catalyst areas, upstream and downstream depending on bank.",
    role:
      "Report oxygen/air-fuel content so the PCM can control fueling and monitor catalyst efficiency.",
    service:
      "Diagnose wiring, exhaust leaks, fuel trims, and catalyst condition before replacing a sensor.",
    notes: [
      "Upstream air-fuel sensors and downstream oxygen sensors are not always interchangeable.",
      "Use sensor-safe anti-seize only if allowed and keep it away from the sensor tip.",
      "Bank and sensor position matter; verify before ordering."
    ],
    numbers: [
      ["Honda front LAF", "36531-5G0-A11", "Front lean air-fuel sensor listing."],
      ["Honda rear LAF", "36541-5G0-A11", "Rear lean air-fuel sensor listing."],
      ["Honda O2", "36532-5J6-A01 / 36542-5G0-A01", "Oxygen sensor references; verify bank and position."]
    ]
  }
};
