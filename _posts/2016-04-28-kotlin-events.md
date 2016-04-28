---
layout:     post
title:      "Lightweight events in Kotlin"
date:       2016-04-28 15:35:00 +03:00
keywords:   kotlin
---

In one of my applications I needed some minimalistic event system
and all I can found was require creating a ton of classes or use a lot 
of annotations, or was magick-scala-like with
overloaded `-=`, `+=` and `()` just because author can do it.

So I decided to write something very simple, with interface like:

~~~scala
ClickEvent on {
    println("CLICK: ${it.x} ${it.y}")
}

ClickEvent(10, 20).emit()
~~~

And it was implemented easily:

~~~scala
open class Event<T> {
    var handlers = listOf<(T) -> Unit>()

    infix fun on(handler: (T) -> Unit) {
        handlers += handler
    }

    fun emit(event: T) {
        for (subscriber in handlers) {
            subscriber(event)
        }
    }
}

data class ClickEvent(val x: Int, val y: Int) {
    companion object : Event<ClickEvent>()

    fun emit() = Companion.emit(this)
}

ClickEvent on {
    println("CLICK: ${it.x} ${it.y}")
}

ClickEvent(10, 20).emit()

>>> CLICK: 10 20
~~~

You can notice a bit of boilerplate, main reason to have it is because
in Kotlin we don't have static methods, we can't use inheritance with
data classes and also we can't use companion object of interface
(or even parent class) in class that implements it. So in each event
we have to duplicate some redundant code:

~~~scala
data class MyEvent(val data: String) {
    companion object : Event<MyEvent>()

    fun emit() = Companion.emit(this)
}
~~~

Back to positive side, let's implement a few other events and try it in
action. Start from event without arguments, it can't be a data class:

~~~scala
class ConnectionLostEvent {
    companion object : Event<ConnectionLostEvent>()

    fun emit() = Companion.emit(this)
}

ConnectionLostEvent on {
    println("Oh, snap!")
}

ConnectionLostEvent().emit()

>>> Oh, snap!
~~~

What if we want events hierarchy, we can use sealed class for event type
and few classes for events. They also can't be data classes:

~~~scala
sealed class MouseEvent {
    companion object : Event<MouseEvent>()

    class Click(val x: Int, val y: Int) : MouseEvent() {
        fun emit() = Companion.emit(this)
    }

    class Move(val fromX: Int, val fromY: Int, val toX: Int, val toY: Int) : MouseEvent() {
        fun emit() = Companion.emit(this)
    }
}

MouseEvent on {
    when (it) {
        is MouseEvent.Click -> println("Click x:${it.x} y:${it.y}")
        is MouseEvent.Move -> println(
                "Move from ${it.fromX}:${it.fromY} to ${it.toX}:${it.toY}")
    }
}

MouseEvent.Click(50, 40).emit()
MouseEvent.Move(0, 0, 9, 12).emit()

>>> Click x:50 y:40
>>> Move from 0:0 to 9:12
~~~

As you can see it isn't that nice that it can be implemented with
Scala or Clojure. Kotlin isn't rich language, but it's simple and
works pretty well on Android.

Also you notice that code highlighting in the article looks wrong,
it's because rouge, highlighting engine used by github pages, [doesn't
support Kotlin right now](https://github.com/jneen/rouge/issues/295),
and I just used one for Scala.
