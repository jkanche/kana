# Step module design 

## Overview

Each step in the analysis is implemented as an ES6 module.
The expected public functions and variables are listed in the sections below.

## `changed`

This is a boolean that indicates whether the analysis state (i.e., results and parameters) changed for this step.
For example, we would set `changed = true` if the analysis parameters changed.
This variable is primarily used to propagate any changes in upstream inputs;
each step can check the `changed` value of its upstream steps to determine whether it needs to be executed.

A `null` value for `changed` indicates that this step needed to be executed but was skipped.
This is occasionally relevant if there are multiple choices of steps for a particular section of the analysis workflow;
the choice of one step allows us to skip the unnecessary execution of the other steps by setting `changed = null`.
Note that skipped steps may still have `changed = false` in some cases (e.g., they were previously executed and the parameters/inputs have not changed).

### `compute(args)`

This function takes an object containing the analysis parameters and performs some compute.
The return value is ignored.

Typically, each module will have unexported `parameters` and `cache` objects.
The former holds the parameters corresponding to the current analysis state for this step,
while the latter holds cached results of computations for the current state.
With these objects, the implementation of `compute(args)` usually looks like the following: 

1. Check if any upstream steps have changed state (based on their `changed`).
   Further check whether the `args` have changed from `parameters`.
   If there are no changes, there is no need to rerun the current step.
   Set `changed = false` to indicate to downstream steps that the state of the current step is unchanged.
2. Otherwise, perform the necessary analysis with the given `args`.
   Store the results in `cache` (freeing any previous results) and update `parameters` to `args`.
   Set `changed = true` to indicate to downstream steps that the state has changed.

If the current step (or its upstream dependencies) may be skipped, the implementation becomes a bit more complex.
The decision to skip is highly step-specific and can involve the parameters and/or the skipping of upstream steps.
To indicate that a step was skipped, we set `changed = null` as described previously.
We obviously do not need to perform any compute.
However, we must still keep `parameters` up to date with the provided `args` (for serialization purposes, see below).
It is also good housekeeping to free any existing results.

In some cases, we may choose to implement a skipped step as `changed = false` as per procedure **1** above.
This requires that there are no changes to the parameters or upstream inputs in **1**, 
_and_ downstream steps are appropriately parameterized to ignore any results of this step.
Under such conditions, the effect of `changed = false` is almost the same as skipping the execution with `changed = null`,
with the bonus of being able to quickly restore the current state when the user chooses to un-skip the step.

If `compute()` is run, any cached results loaded by `unserialize()` should be removed (see below).

## `results()`

This function returns an object containing the results of the `compute()`'d analysis to post to the main thread.
Not all results of the step need to be posted, and if no results are to be posted, an empty object should be returned.

If the state of the current step was loaded by `unserialize(step)`, the `results()` function should be capable of using the unserialized results.
This should give the same object (within numerical precision) as if the results were generated by `compute()`.

In very special cases, a promise may be returned that resolves to an object.
This is necessary when dealing with compute in a separate worker (e.g., the t-SNE and UMAP steps).

Developers can assume that `results()` will only be called if the step was not skipped, i.e., some results are actually computed.

### `serialize()`

This function returns an object containing the parameters and results of the `compute()`'d analysis for serialization.
The results should be, at the very least, a superset of any information returned by `results()`,
such that unserialization provides enough information for `results()` to behave "as if" the analysis was actually performed.

Where possible, the results in `serialize()` should also contain all necessary information to satisfy any other getters exported by the module.
This ensures that, if downstream steps need to be re-executed, they can call the current step's getters to obtain the necessary results without any recomputation of the current step.

If the step was skipped, the results should be set to `null`.
However, the parameters should still be returned.

In very special cases, a promise may be returned that resolves to an object.
This is necessary when dealing with compute in a separate worker (e.g., the t-SNE and UMAP steps).

## `unserialize(state)`

This function accepts an object created by `serialize()` and modifies the internal state of the module "as if" `compute()` had been run.
This is called during the loading of an existing analysis.
The return value is ignored.

Typical implementations will store the unserialized contents in `cache.reloaded`.
Both `results()` and serialize()` should be capable of detecting that unserialized values are present and using them, 
instead of searching for (and failing to find) the results from `compute()`.
However, if `compute()` is ever run for this step, any values in `cache.reloaded` will be stale and should be removed.

In theory, `changed` should be set to `true` as the analysis state has been overwritten.
In practice, this doesn't matter as the unserialization is usually done for all steps at once,
so no downstream step actually has the chance to inspect any `changed` value.

If the step was skipped, this will be indicated as a `null` value for the results.
If so, `unserialize()` should set `changed = null`.

## Other getters

Each module is encouraged to export getters for specific results needed by downstream steps.
This design aims to promote loose coupling between steps for greater modularity.

Getters should be able to use either the results generated by `compute()` or loaded results from `unserialize()`.
If the result was not serializable in `serialize()`, the getter should be able to perform the compute to obtain the relevant result.
This should use the exact same calculations as that performed in procedure **2** of `compute()`.
We also recommend caching the result for future use, and deleting `cache.reloaded` to indicate that unserialized values have been replaced by their computed counterparts.