from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Iterable, Mapping, Sequence

DIMENSIONS = ("Movement", "Evolution", "Being", "Design", "Space")
AXES = (
    ("planetary", 1, 13), ("dimension", 1, 5), ("gate", 1, 64),
    ("line", 1, 6), ("color", 1, 6), ("tone", 1, 6), ("base", 1, 5),
    ("degree", 0, 29), ("minute", 0, 59), ("second", 0, 59),
    ("arc", 0, 99), ("zodiac", 1, 12), ("house", 1, 12),
)
CHANNEL_DATA = (
("01-08","Inspiration",(1,8),"G","Throat","Knowing","attention"),
("02-14","Beat",(2,14),"G","Sacral","Knowing","radial"),
("03-60","Mutation",(3,60),"Sacral","Root","Knowing","liquid-state"),
("04-63","Logic",(4,63),"Ajna","Head","Understanding","feedforward"),
("05-15","Rhythm",(5,15),"Sacral","G","Understanding","self-organizing"),
("06-59","Intimacy",(6,59),"Solar Plexus","Sacral","Defense","boundary-crossing"),
("07-31","Alpha",(7,31),"G","Throat","Understanding","hierarchical"),
("09-52","Concentration",(9,52),"Sacral","Root","Understanding","fixed-random"),
("10-20","Awakening",(10,20),"G","Throat","Integration","direct-policy"),
("10-34","Exploration",(10,34),"G","Sacral","Centering","actor-critic"),
("10-57","Perfected Form",(10,57),"G","Spleen","Integration","adaptive-control"),
("11-56","Curiosity",(11,56),"Ajna","Throat","Sensing","generative-language"),
("12-22","Openness",(12,22),"Throat","Solar Plexus","Knowing","variational-autoencoder"),
("13-33","Prodigal",(13,33),"G","Throat","Sensing","episodic-memory"),
("16-48","Wavelength",(16,48),"Throat","Spleen","Understanding","sparse-autoencoder"),
("17-62","Acceptance",(17,62),"Ajna","Throat","Understanding","restricted-boltzmann"),
("18-58","Judgement",(18,58),"Spleen","Root","Understanding","hopfield"),
("19-49","Synthesis",(19,49),"Root","Solar Plexus","Ego","hidden-markov"),
("20-34","Charisma",(20,34),"Throat","Sacral","Integration","motor-policy"),
("20-57","Brainwave",(20,57),"Throat","Spleen","Knowing","echo-state"),
("21-45","Money Line",(21,45),"Heart","Throat","Ego","resource-allocation"),
("23-43","Structuring",(23,43),"Throat","Ajna","Knowing","deconvolutional"),
("24-61","Awareness",(24,61),"Ajna","Head","Knowing","neural-turing"),
("25-51","Initiation",(25,51),"G","Heart","Centering","spiking-threshold"),
("26-44","Surrender",(26,44),"Heart","Spleen","Ego","memory-prediction"),
("27-50","Preservation",(27,50),"Sacral","Spleen","Defense","regulator"),
("28-38","Struggle",(28,38),"Spleen","Root","Knowing","adversarial"),
("29-46","Discovery",(29,46),"Sacral","G","Sensing","reinforcement"),
("30-41","Recognition",(30,41),"Solar Plexus","Root","Sensing","recurrent"),
("32-54","Transformation",(32,54),"Spleen","Root","Ego","evolutionary"),
("34-57","Power",(34,57),"Sacral","Spleen","Integration","sensorimotor"),
("35-36","Transitoriness",(35,36),"Throat","Solar Plexus","Sensing","sequence-to-sequence"),
("37-40","Community",(37,40),"Solar Plexus","Heart","Ego","game-theory"),
("39-55","Emoting",(39,55),"Root","Solar Plexus","Knowing","gru"),
("42-53","Maturation",(42,53),"Sacral","Root","Sensing","deep-belief"),
("47-64","Abstraction",(47,64),"Ajna","Head","Sensing","encoder"),
)
FIBONACCI = (1,1,2,3,5,8,13,21,34,55,89,144)

@dataclass(frozen=True)
class Coordinate:
    planetary:int; dimension:int; gate:int; line:int; color:int; tone:int; base:int
    degree:int; minute:int; second:int; arc:int; zodiac:int; house:int
    def __post_init__(self):
        for name,lo,hi in AXES:
            value=getattr(self,name)
            if not lo <= value <= hi: raise ValueError(f"{name} must be {lo}..{hi}")
    def to_dict(self): return asdict(self)

class BeingStateSpace:
    axes=AXES
    def size(self)->int:
        n=1
        for _,lo,hi in self.axes:n*=hi-lo+1
        return n
    def encode(self,c:Coordinate)->int:
        index=0
        for name,lo,hi in self.axes:index=index*(hi-lo+1)+(getattr(c,name)-lo)
        return index
    def decode(self,index:int)->Coordinate:
        if not 0<=index<self.size():raise ValueError("state index out of range")
        values={}
        for name,lo,hi in reversed(self.axes):
            width=hi-lo+1; values[name]=index%width+lo; index//=width
        return Coordinate(**values)
    def traverse(self,c:Coordinate,axis:str,steps:int=1)->Coordinate:
        spec=next((x for x in self.axes if x[0]==axis),None)
        if not spec: raise ValueError(f"unknown axis: {axis}")
        _,lo,hi=spec; data=c.to_dict(); data[axis]=lo+(data[axis]-lo+steps)%(hi-lo+1)
        return Coordinate(**data)

@dataclass(frozen=True)
class Activation:
    gate:int; source:str; coordinate:Coordinate|None=None
    def __post_init__(self):
        if not 1<=self.gate<=64:raise ValueError("gate must be 1..64")

@dataclass(frozen=True)
class Channel:
    code:str; name:str; gates:tuple[int,int]; centers:tuple[str,str]
    circuit:str; processing_analogue:str; sources:tuple[str,...]; temporary:bool
    def to_dict(self):return asdict(self)

@dataclass(frozen=True)
class UserFieldState:
    natal_gates:tuple[int,...]; active_gates:tuple[int,...]; active_centers:tuple[str,...]
    channels:tuple[Channel,...]; space_generation:int; space_context:dict[str,Any]
    recurrence_schedule:tuple[int,...]; routed_channel:str|None
    def to_dict(self):return asdict(self)

class ActivationEngine:
    def evaluate(self,natal:Iterable[int],transits:Sequence[Activation]=(),contacts:Sequence[Activation]=(),previous_space_generation:int=0)->UserFieldState:
        natal_set=set(natal)
        if any(not 1<=g<=64 for g in natal_set):raise ValueError("natal gates must be 1..64")
        acts=[Activation(g,"natal") for g in natal_set]+list(transits)+list(contacts)
        by_gate={}
        for a in acts:by_gate.setdefault(a.gate,set()).add(a.source)
        channels=[]
        for code,name,gates,c1,c2,circuit,analogue in CHANNEL_DATA:
            if set(gates)<=set(by_gate):
                sources=tuple(sorted(by_gate[gates[0]]|by_gate[gates[1]]))
                temporary=not set(gates)<=natal_set
                channels.append(Channel(code,name,gates,(c1,c2),circuit,analogue,sources,temporary))
        centers=tuple(sorted({c for ch in channels for c in ch.centers}))
        routed=max(channels,key=lambda c:(len(c.sources),not c.temporary,c.code)).code if channels else None
        emergence=1 if channels else 0
        return UserFieldState(
            tuple(sorted(natal_set)),tuple(sorted(by_gate)),centers,tuple(channels),
            previous_space_generation+emergence,
            {"contributors":[ch.code for ch in channels],"recursive":True,"emerged":bool(emergence)},
            FIBONACCI[:min(len(channels)+1,len(FIBONACCI))],routed)

def reaction_flux(state:UserFieldState)->dict[str,Any]:
    return {"nodes":[{"id":c,"kind":"center"} for c in state.active_centers],
      "edges":[{"id":ch.code,"source":ch.centers[0],"target":ch.centers[1],
      "temporary":ch.temporary,"processing_analogue":ch.processing_analogue,
      "sources":list(ch.sources)} for ch in state.channels],
      "space":state.space_context}
