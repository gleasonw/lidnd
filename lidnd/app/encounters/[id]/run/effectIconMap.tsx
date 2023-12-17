"use client";
import {
  EyeOff,
  Heart,
  VolumeX,
  AlertTriangle,
  Hand,
  Eye,
  Anchor,
  ArrowDownCircle,
  Lock,
  ZapOff,
  Moon,
  ThermometerSun,
  Skull,
  ToyBrick,
  XCircle,
} from "lucide-react";
import React from "react";

export const effectIconMap = {
  Blinded: <EyeOff className="text-gray-500" />,
  Charmed: <Heart className="text-pink-500" />,
  Deafened: <VolumeX className="text-blue-500" />,
  Frightened: <AlertTriangle className="text-yellow-500" />,
  Grappled: <Hand className="text-green-500" />,
  Incapacitated: <XCircle className="text-red-500" />,
  Invisible: <Eye className="text-purple-500" />,
  Paralyzed: <Anchor className="text-indigo-500" />,
  Petrified: <ToyBrick className="text-stone-500" />,
  Poisoned: <Skull className="text-lime-500" />,
  Prone: <ArrowDownCircle className="text-orange-500" />,
  Restrained: <Lock className="text-teal-500" />,
  Stunned: <ZapOff className="text-violet-500" />,
  Unconscious: <Moon className="text-slate-500" />,
  Exhaustion: <ThermometerSun className="text-amber-500" />,
};
