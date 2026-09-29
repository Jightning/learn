# Mathematical source notes

These notes are original task data. They give models and definitions, not a
worked answer key. Derive the requested cases yourself and check by
substitution. Use source references M1–M4 in the submission.

## M1: Solutions and initial values

A solution of an ordinary differential equation is a differentiable function
that makes the equation true on its stated interval. An initial-value problem
adds values of the unknown function, or its derivatives, at a specified time.
Verifying a candidate requires differentiating it, substituting it into the
equation, and checking every initial value. A graph alone cannot verify an
equation. The physical interpretation also depends on the model's assumptions
and units.

## M2: Forced oscillation

An ideal undamped oscillator with unit mass and spring constant 4 obeys
`x'' + 4x = F cos(ωt)`. Its unforced natural angular frequency is 2. A forcing
term at angular frequency 2 coincides with a homogeneous mode; a constant
multiple of `cos(2t)` is therefore not a valid particular-solution trial.
At a different frequency a sinusoidal particular trial is possible. Exact
undamped resonance is an ideal model: damping or nonlinear effects can bound or
alter a physical response.

Teach and solve the fresh initial-value problem
`x'' + 4x = 3 cos(2t), x(0)=0, x'(0)=0`.
Also compare it with `x'' + 4x = 3 cos(t)` under the same initial values. Do not
call every large response resonance, and do not confuse a transient, a beat,
and a linearly growing resonant envelope.

## M3: Repeated eigenvalues

A system `u'=Au` can have a repeated characteristic root. The root's algebraic
multiplicity counts its repetition; its eigenspace dimension counts independent
eigenvectors. If the latter is smaller, an ordinary sum of eigenvector modes
does not span all solutions. A generalized eigenvector can complete the chain.
Teach and solve
`u'=Au, A=[[-2,3],[0,-2]], u(0)=(1,1)`.
Describe the direction of motion and the limiting tangent direction in the
phase plane. A portrait must distinguish the trajectory from the eigenline.

## M4: Switched input

Let `H(t-1)` be 0 for `t<1` and 1 for `t>=1`. Teach and solve
`y'+2y=H(t-1), y(0)=0` for `t>=0`. The solution is continuous at the switch,
although its derivative changes there. Explain this from the equation and
initial value; a discontinuous jump in `y` would require a different kind of
input. Connect this example to the idea of forcing from M2 without claiming
the two equations have the same solution method.
